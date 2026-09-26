# Going live: what's left for you

These steps need your accounts, your money or your decisions, so they aren't automated. Do them in this order. Each section says what you need first, the exact steps, and how to check it worked.

| # | Step | Needs | Rough time |
| --- | --- | --- | --- |
| 1 | [Provision Azure and deploy](#1-provision-azure-and-deploy) | Azure subscription, GitHub repo admin | 30 min |
| 2 | [Custom domain and `SITE_URL`](#2-custom-domain-and-site_url) | A domain you own | 30 min + DNS wait |
| 3 | [Email with Resend](#3-email-with-resend) | Resend account, DNS access | 30 min + DNS wait |
| 4 | [Real payments with Stripe](#4-real-payments-with-stripe) | Stripe account (company details, bank account) | 1 h + Stripe verification |
| 5 | [Instagram connect (Meta App Review)](#5-instagram-connect-meta-app-review) | Meta developer account, business verification, privacy policy | days to weeks |

Until step 4 is done, the site takes **test payments only**. The "Test mode" pill in the header and the "Test payment — no money is taken" banner on Checkout make that visible.

> **Redeploying overwrites every app setting.** `infra/deploy.ps1` passes *all* settings to Bicep. If you rerun it without, say, `-StripeSecretKey`, the Stripe key is set back to empty. Either always pass every parameter you use (keep the full command in a password manager), or change single settings with `az staticwebapp appsettings set` (shown in each step).

---

## 1. Provision Azure and deploy

**You need:** an Azure subscription, the Azure CLI (`az`), and admin rights on `github.com/hanssonfredrik/printagram`.

1. Sign in and pick the subscription:
   ```powershell
   az login
   az account set --subscription "<subscription name or id>"
   ```
2. Create the resources: a Storage account and a Static Web App on the Free plan.
   ```powershell
   ./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope
   ```
   - The first run generates three secrets into `infra/.secrets.prod.json`. That file is git-ignored. **Back it up** (password manager). If you lose it, the next deploy generates new secrets, which signs everyone out and makes stored Instagram tokens unreadable.
   - Payments stay on `fake` (the default).
3. The script prints three values. In GitHub, add each one under **Settings → Secrets and variables → Actions → New repository secret**:
   | Secret | Value |
   | --- | --- |
   | `AZURE_STATIC_WEB_APPS_API_TOKEN` | printed token |
   | `CRON_URL` | `https://<name>.azurestaticapps.net` |
   | `CRON_SECRET` | printed cron secret |
4. Deploy by pushing `main`. `.github/workflows/deploy.yml` runs lint, typecheck, all tests (including API tests on Azurite and the PDF check), then builds and publishes the app and API. **Every push to `main` deploys to production.** Pull requests get their own preview URL.
5. Check that it worked:
   - `https://<name>.azurestaticapps.net/api/health` returns `{"ok":true,…}`.
   - The landing page shows the "Test mode" pill.
   - Make a book with the fixture ZIP (`fixtures/instagram-fixture.zip`), pay with test card 4242, and download the PDF.
   - **Actions → Scheduled maintenance → Run workflow** finishes green. That's the daily cron.
6. Optional: seed test discount codes in the real storage account:
   ```powershell
   $env:STORAGE_CONNECTION_STRING = az storage account show-connection-string -g printagram-rg -n <storage account> --query connectionString -o tsv
   npx tsx scripts/promo.ts seed        # WELCOME100 and TEST20
   ```
   Disable them before real launch with `npx tsx scripts/promo.ts disable WELCOME100` (and `TEST20`).

---

## 2. Custom domain and `SITE_URL`

**You need:** a domain (the examples use `printagram.app`) and access to its DNS.

1. In the portal, open **Static Web App → Custom domains → Add**.
   - `www.printagram.app` takes a CNAME to `<name>.azurestaticapps.net`.
   - The apex `printagram.app` needs a TXT validation record, then an ALIAS/ANAME record (or an A record if your DNS host has no ALIAS).
   - The Free plan allows 2 custom domains with free certificates.
2. Point the app at the new origin: e-mail links, OAuth redirect and blob upload CORS all use it. Redeploy with *all* the parameters you already use:
   ```powershell
   ./infra/deploy.ps1 -ResourceGroup printagram-rg `
     -AppBaseUrl https://printagram.app `
     -ExtraCorsOrigins https://printagram.app,https://www.printagram.app
   ```
   Every origin users open the site from must be in `-ExtraCorsOrigins`. Otherwise photo uploads fail with a CORS error.
3. Set the repository **variable**, not secret, `SITE_URL` = `https://printagram.app` under **Settings → Secrets and variables → Actions → Variables**. The next build then adds the canonical link, `og:url` and an absolute `og:image`, and emits `sitemap.xml` plus a `Sitemap:` line in `robots.txt`.
4. Update `CRON_URL` to `https://printagram.app`. Optional, but the cron then hits the domain users use.
5. Push `main`, or re-run the latest deploy workflow.
6. Check that it worked:
   - `https://printagram.app/robots.txt` lists the sitemap.
   - `https://printagram.app/sitemap.xml` exists.
   - The page source has `<link rel="canonical" href="https://printagram.app/">`.
   - Paste the URL into a link preview (Slack, LinkedIn post inspector) and see the card image.

---

## 3. Email with Resend

Without this, emails are only written to the Functions log. That covers return links, "your book is ready", password reset and the deletion reminders.

**You need:** a Resend account (the free tier is 3 000 emails/month) and DNS access for the sending domain.

1. **Resend → Domains → Add domain**, e.g. `printagram.app`. It's better to use a subdomain such as `mail.printagram.app` so your main domain's reputation is separate.
2. Add the DNS records Resend shows: SPF (TXT), DKIM (CNAME/TXT) and the recommended DMARC TXT (`v=DMARC1; p=none; rua=mailto:you@…` to start). Wait for Resend to show **Verified**.
3. **Resend → API keys → Create** with *Sending access* only, limited to that domain.
4. Apply it (one of the two):
   ```powershell
   # redeploy with all your parameters plus:
   ./infra/deploy.ps1 -ResourceGroup printagram-rg ... -ResendApiKey re_xxx -EmailFrom "Printagram <hello@printagram.app>"
   # or change only these settings:
   az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names EMAIL_PROVIDER=resend RESEND_API_KEY=re_xxx "EMAIL_FROM=Printagram <hello@printagram.app>"
   ```
   The `EMAIL_FROM` address must be on the verified domain.
5. Check that it worked:
   - On the waiting screen, enter your address under "Send me a link"; the return-link email arrives.
   - Place a test order; "Your book is ready" arrives.
   - Check the headers show `dkim=pass` and `spf=pass`.

---

## 4. Real payments with Stripe

The code for Stripe is in place but switched off. It runs only when `PAYMENT_PROVIDER=stripe` **and** all three keys are set. It never switches on by itself because keys exist.

**You need:** a Stripe account with business details and a payout bank account. Stripe may ask for verification before live payouts.

**First with Stripe test keys (recommended), on a preview or the production site:**

1. **Stripe Dashboard → Developers → API keys** (test mode): copy `pk_test_…` and `sk_test_…`.
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://printagram.app/api/stripe/webhook`, or your `*.azurestaticapps.net` host.
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.
   - Copy the **Signing secret** `whsec_…`.
3. **Settings → Payment methods → Payment method domains**: add every domain the site runs on (the `azurestaticapps.net` host and each custom domain). Apple Pay and Google Pay only show up on registered domains.
4. Switch the provider:
   ```powershell
   ./infra/deploy.ps1 -ResourceGroup printagram-rg ... -PaymentProvider stripe `
     -StripeSecretKey sk_test_xxx -StripePublishableKey pk_test_xxx -StripeWebhookSecret whsec_xxx
   ```
   Or use `az staticwebapp appsettings set … --setting-names PAYMENT_PROVIDER=stripe STRIPE_SECRET_KEY=… STRIPE_PUBLISHABLE_KEY=… STRIPE_WEBHOOK_SECRET=…`.
5. Check that it worked:
   - The "Test mode" pill and the test-card banner are gone, and Checkout shows Stripe's card form (plus Apple Pay / Google Pay on supported devices).
   - Pay with Stripe's test card `4242 4242 4242 4242`: the order becomes paid, the PDF builds, and Stripe → Webhooks shows `200` deliveries.
   - Pay with `4000 0000 0000 0002`: you see the decline reason and can retry.
   - A discount code still works. `WELCOME100` skips payment entirely.

**Then go live:**

6. Repeat steps 1–4 with **live** mode keys and a **live** webhook endpoint (live and test webhooks are separate).
7. Before announcing:
   - Disable the test codes (`npx tsx scripts/promo.ts disable WELCOME100`, same for `TEST20`).
   - Make one real purchase with your own card, then refund it in Stripe. The order should show as refunded on its Done page.

---

## 5. Instagram connect (Meta App Review)

Until this is approved, the "Connect Instagram" card shows "coming soon" and everyone uses the export upload, which already works for all accounts.

**You need:**
- A Meta developer account.
- **Business verification** of your company (Meta Business Manager).
- **A public privacy policy URL, and ideally terms of service. The app doesn't have these pages yet**, so write them (or ask me to add `/privacy` and `/terms` pages) before submitting.

1. **developers.facebook.com → My Apps → Create app.** Choose type *Business*, then add the **Instagram** product → *API setup with Instagram business login*.
2. Under *Instagram → API setup → Business login settings*, set:
   | Field | Value |
   | --- | --- |
   | OAuth redirect URI | `https://printagram.app/api/instagram/callback` |
   | Deauthorize callback URL | `https://printagram.app/api/instagram/deauthorize` |
   | Data deletion request URL | `https://printagram.app/api/instagram/data-deletion` |
3. Copy the **Instagram app ID** and **Instagram app secret**.
4. Test with Standard Access first:
   - Add yourself and a few testers under **App roles → Roles → Instagram Testers**. Each tester accepts the invite in Instagram → Settings → Apps and websites.
   - Testers need a Creator or Business account.
   - Enable the feature, ideally on a PR preview environment first:
     ```powershell
     ./infra/deploy.ps1 -ResourceGroup printagram-rg ... -ConnectEnabled -IgAppId <id> -IgAppSecret <secret>
     ```
     `IG_REDIRECT_URI` is derived from `-AppBaseUrl`, so it must exactly match what you entered in step 2.
   - Check: Choose source → Connect Instagram → log in on Instagram → back in the app, the import runs and the photos show likes.
5. Submit **App Review** for `instagram_business_basic` (Advanced Access). You'll need:
   - Business verification completed.
   - The privacy policy URL, plus an app icon and category.
   - A screencast showing: log in on Instagram → grant permission → your posts appear → building a book from them.
   - A short text explaining the use: *"Users connect their own professional Instagram account to import their own posts into a printable photo book. We read media and captions only; nothing is posted."*
6. Once approved, `FEATURE_CONNECT_ENABLED=true` in production opens connect to everyone (`-ConnectEnabled` on the deploy, or `az staticwebapp appsettings set … --setting-names FEATURE_CONNECT_ENABLED=true`).

---

## 6. Google Photos import (Google OAuth verification)

The third source card. It works for every Instagram account, private ones included: the user has Instagram transfer their posts to Google Photos (Accounts Center → Transfer a copy of your information), then picks them in Google's Picker and Printagram copies the selection. Captions and likes do not come along; dates are what Google Photos knows. The flag is on by default; the card stays hidden until the client ID and secret are set. Step-by-step console instructions: `docs/GOOGLE_OAUTH_SETUP.md`.

**You need:**
- A Google Cloud project with the **Google Photos Picker API** enabled.
- The public privacy policy URL (same as for Meta) and ownership of the domain verified in Google Search Console.

1. **console.cloud.google.com → APIs & Services → Library**: enable *Google Photos Picker API*.
2. **OAuth consent screen**: user type *External*, app name Printagram, support email, app logo, homepage, privacy policy and terms URLs, authorized domain `printagram.app`. Add the scope `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Publish the app (it stays "unverified" with a warning screen and a 100-user cap until step 5).
3. **Credentials → Create credentials → OAuth client ID**, type *Web application*:
   | Field | Value |
   | --- | --- |
   | Authorized redirect URI | `https://printagram.app/api/google/callback` (and the PR preview host while testing) |
   Copy the client ID and secret.
4. Test with your own Google account (add it under *Test users* while the consent screen is in testing):
   ```powershell
   ./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope -GoogleClientId <id> -GoogleClientSecret <secret>
   ```
   `GOOGLE_REDIRECT_URI` is derived from `-AppBaseUrl`, so it must match step 3 exactly. Check: Choose source → Via Google Photos → sign in → Pick photos → a Google Photos tab opens → pick → Done → back in the app the copy runs and the photos show up without captions.
5. Submit for **verification** (Verification Center): brand verification, then the scope with a short justification (*"Users pick their own photos in Google Photos to build a printable photo book; read-only, no library access beyond the selection"*) and a screencast of the flow.
6. Once verified, the Google consent screen can go from Testing to In production and everyone can sign in. `FEATURE_GOOGLE_PHOTOS_ENABLED` is already `true` by default; set it to `false` to hide the card.

---

## 7. Meta transfer destination (future, the real fix for private accounts)

Becoming a destination in Meta's "Transfer a copy of your information" tool would let any Instagram account, private ones included, push posts (with captions) straight to Printagram. Nothing is built for it yet; the prerequisites are yours and take weeks, so start them early if you want this path (details and sources in `docs/RESEARCH.md`):

1. **DTI Data Trust Registry, Level 1** at https://dt-reg.org/: company registration number (LEI/DUNS), homepage, a privacy policy that covers collection, use, sharing, protection, retention and data-subject rights, a security contact, a service description.
2. **Meta Business Manager verification** (shared with section 5).
3. On developers.facebook.com create a **Data Transfer app** (use case "Allow users to transfer their data to other apps") and contact the team via the form or dataportability@meta.com.
4. Then the build: an OAuth 2.0 server (Meta is the client) and an HTTP importer for photos/videos/posts per Meta's Generic Importers spec; Meta engineers run test transfers before release.

---

## Before you announce: checklist

- [ ] `https://<domain>/api/health` is OK, and the scheduled maintenance workflow is green.
- [ ] `infra/.secrets.prod.json` is backed up.
- [ ] Emails arrive (return link, book ready) and pass DKIM/SPF.
- [ ] Live Stripe purchase and refund tested; test promo codes disabled.
- [ ] `SITE_URL` variable set; the link preview shows the card image.
- [ ] Privacy policy and terms pages exist (needed for Meta and Google; good practice for GDPR anyway).
- [ ] Google OAuth client verified for the Picker scope before `FEATURE_GOOGLE_PHOTOS_ENABLED` goes on (section 6).
- [ ] Optional: Application Insights attached to the Static Web App (Monitoring) if you want server logs. It isn't provisioned by default, to keep the cost at €0.
