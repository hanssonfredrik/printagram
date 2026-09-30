# Going live: what's left for you

These steps need your accounts, your money or your decisions, so they aren't automated. Do them in this order. Each section says what you need first, the exact steps, and how to check it worked.

| # | Step | Needs | Rough time | Status (checked 30 Sep 2026) |
| --- | --- | --- | --- | --- |
| 1 | [Provision Azure and deploy](#1-provision-azure-and-deploy) | Azure subscription, GitHub repo admin | 30 min | ✅ Done |
| 2 | [Custom domain: inbunden.com](#2-custom-domain-inbundencom) | A domain you own | 30 min + DNS wait | ✅ Done. Update the `CRON_URL` secret (step 2, *Still open*) |
| 3 | [Email with Resend, and receiving mail](#3-email-with-resend-and-receiving-mail) | Resend account, DNS access | 30 min + DNS wait | ✅ Done (send a test mail to confirm) |
| 4 | [Real payments with Stripe](#4-real-payments-with-stripe) | Stripe account (company details, bank account) | 1 h + Stripe verification | 🟡 Stripe live on the site in **test mode**; live keys left |
| 5 | [Instagram connect (Meta App Review)](#5-instagram-connect-meta-app-review) | Meta developer account, business verification, privacy policy | days to weeks | ⬜ |
| 6 | [Google Photos import](#6-google-photos-import-google-oauth-verification) | Google Cloud project | 15 min, verification days | 🟡 Works in Testing mode; verification left |
| 7 | [Meta transfer destination](#7-meta-transfer-destination-future-the-real-fix-for-private-accounts) | Company registration, Meta business verification | weeks | ⬜ Future |

Until step 4 is finished with live keys, the site takes **test payments only**. It runs Stripe with test keys (`pk_test_…`): the "Test mode" pill in the header and the "Stripe test mode" box with test cards on Checkout make that visible.

> **Redeploying overwrites every app setting.** `infra/deploy.ps1` passes *all* settings to Bicep. If you rerun it without, say, `-StripeSecretKey`, the Stripe key is set back to empty. Either always pass every parameter you use (keep the full command in a password manager), or change single settings with `az staticwebapp appsettings set` (shown in each step).

---

## 1. Provision Azure and deploy

**Status: ✅ done.** Static Web App `green-glacier-0dadae803.5.azurestaticapps.net`, GitHub secrets set, every push to `main` deploys.

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
   | `CRON_URL` | `https://<name>.azurestaticapps.net` (switch to `https://inbunden.com` once the custom domain is the default; see step 2) |
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

## 2. Custom domain: inbunden.com

**Status: ✅ done** (checked 30 Sep 2026), apart from the settings under *Still open*.

| Step | Status |
| --- | --- |
| 1. `inbunden.com` on the Static Web App | ✅ Serves the app with its own certificate; `http://` redirects to `https://` |
| 2. Redirects | ✅ `www.inbunden.com` and the generated `green-glacier-0dadae803.5.azurestaticapps.net` host 301 to `https://inbunden.com/` (`inbunden.com` is the default domain). `inbunden.se` and `www.inbunden.se` 301 there via Loopia. Path and query are kept everywhere |
| 4. App settings and CORS | ✅ `APP_BASE_URL=https://inbunden.com`, `GOOGLE_REDIRECT_URI=https://inbunden.com/api/google/callback`; blob CORS allows `https://inbunden.com` (and the azurestaticapps.net host) |
| 5. `SITE_URL` | ✅ Set. Prerendered public pages in English and Swedish, per-page canonical and hreflang, `sitemap.xml` (16 URLs), `llms.txt` |
| 6. Google redirect URI | ✅ Assumed done together with step 4. Confirm with the Google Photos check in step 7 |

**Domains:** `inbunden.com` and `www.inbunden.com` are custom domains on the Static Web App. `inbunden.se` and `www.inbunden.se` are 301 forwards at Loopia, so they never serve the app and need no CORS entry. With `inbunden.com` set as the default domain, Azure also redirects the generated `green-glacier-0dadae803.5.azurestaticapps.net` host. Anything that calls that host directly now gets a `301`.

**Still open:**
- **`CRON_URL` secret** (GitHub → Settings → Secrets and variables → Actions): change it from the azurestaticapps.net address to `https://inbunden.com`. The generated host now redirects, and the daily cron job does not follow redirects. Since this change the job fails with an error instead of silently doing nothing. Afterwards run **Actions → Scheduled maintenance → Run workflow** once and check it's green.
- **Stripe webhook:** if the endpoint in Stripe (Inbunden account → Developers → Webhooks) uses the azurestaticapps.net address, change it to `https://inbunden.com/api/stripe/webhook`. Stripe doesn't follow redirects, so deliveries would fail and orders would only get marked paid through the page's own sync.
- **`IG_REDIRECT_URI`** still points at the azurestaticapps.net host. Change it to `https://inbunden.com/api/instagram/callback` when you do step 5 (it must match the Meta app).

**You need:** DNS access at Loopia and the Static Web App's default hostname (portal → Static Web App → Overview → URL, currently `green-glacier-0dadae803.5.azurestaticapps.net`).

1. **Add `inbunden.com`.** Portal → Static Web App → **Custom domains → Add → Custom domain on other DNS**, enter `inbunden.com`, choose **TXT** validation. At Loopia add the TXT record the portal shows, then point the bare domain at the app with an ALIAS/ANAME record to the default hostname, or the A record the portal suggests if Loopia offers no ALIAS. Wait until the portal shows **Ready**: the domain is only live when `https://inbunden.com` serves the app with a certificate for `inbunden.com` (before that Azure answers with a generic `*.azurewebsites.net` certificate and a 404).
2. **Redirects.** `inbunden.se` and `www.inbunden.se`: a permanent (301) web forward at Loopia to `https://inbunden.com`, instead of Loopia's "parked" page. `www.inbunden.com`: added as a custom domain on the Static Web App (CNAME at Loopia to the default hostname), with `inbunden.com` set as the **default domain** so Azure redirects `www` to it.
3. **Nothing else in Azure DNS.** The TXT record must stay.
4. **Point the app at the new origin.** E-mail links, the Google/Instagram redirect URIs and the blob-upload CORS rules all use it. Change only these settings, plus the storage CORS rule:
   ```powershell
   az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names APP_BASE_URL=https://inbunden.com GOOGLE_REDIRECT_URI=https://inbunden.com/api/google/callback
   $acct = az storage account list -g printagram-rg --query "[0].name" -o tsv
   az storage cors add --services b --account-name $acct --origins https://inbunden.com --methods GET HEAD PUT OPTIONS --allowed-headers "*" --exposed-headers ETag x-ms-request-id Content-Length --max-age 3600
   ```
   Every origin users open the site from must be allowed, otherwise photo uploads fail with a CORS error. `www` and `.se` only redirect, so `https://inbunden.com` is enough. The next time you run `deploy.ps1` for other reasons, pass `-AppBaseUrl https://inbunden.com -ExtraCorsOrigins https://inbunden.com` so it keeps these values.
5. **GitHub.** The repository **variable** `SITE_URL` = `https://inbunden.com` is set (Settings → Secrets and variables → Actions → Variables). `CRON_URL` must be `https://inbunden.com`: with a default domain set, the azurestaticapps.net host answers `301`, and the cron job does not follow redirects. Re-run the latest deploy workflow (or push `main`) so the build picks up `SITE_URL`: canonical link, `og:url`, absolute `og:image`, `sitemap.xml`.
6. **Google console** (see `docs/google-oauth-setup.md`): add `https://inbunden.com/api/google/callback` to the client's redirect URIs; keep the azurestaticapps.net one until the domain works.
7. Check that it worked:
   - `https://inbunden.com/api/health` returns `{"ok":true,…}`, and `curl -I` on `https://www.inbunden.com/`, `https://inbunden.se/` and `https://www.inbunden.se/` each returns `301` to `https://inbunden.com/`.
   - `https://inbunden.com/sitemap.xml` lists every public page in both languages; the page source of `/about` (View source, not DevTools) has the page text and `<link rel="canonical" href="https://inbunden.com/about">`.
   - Via Google Photos → sign in → you come back to `https://inbunden.com/google`.
   - Uploading an export ZIP on `https://inbunden.com` works (proves CORS).

### 2a. Search engines and AI search

The public pages (landing, about, guides, privacy, terms; English at `/`, Swedish at `/sv/...`) are listed in `app/src/seo/routes.ts`. The deploy workflow prerenders them to static HTML (`scripts/prerender.ts`), so crawlers that don't run JavaScript, such as GPTBot, ClaudeBot and PerplexityBot, see the full text, and the build writes `robots.txt`, `sitemap.xml` and `llms.txt`. App screens (`/books`, `/start`, …) and unknown URLs get the SPA shell with `noindex`.

After the first deploy with these changes:

1. **Google Search Console:** Sitemaps → submit `https://inbunden.com/sitemap.xml`. URL inspection on `/` and `/sv` → **Request indexing**, and use **View crawled page** to confirm Google sees the text. Later, check **Performance** and the generative AI report now and then.
2. **Bing Webmaster Tools** (feeds ChatGPT search and Copilot): sign in at bing.com/webmasters → **Import from Google Search Console** → submit the sitemap there too.
3. **Rich results:** run `https://inbunden.com/` and one guide through search.google.com/test/rich-results and validator.schema.org. Expect Organization, WebSite, FAQPage, Article and BreadcrumbList. The Product offer only appears once `PAYMENT_PROVIDER` is `stripe`.
4. **One host only:** `www.inbunden.com` is on the Static Web App and `inbunden.se` forwards at Loopia. Both redirect to inbunden.com. The Free plan's 2 custom domains are now both used, so any further domains go through Loopia forwards.
5. **Profiles:** once Inbunden has an Instagram or other public profile, add the URLs as `sameAs` on the Organization in `app/src/seo/jsonld.ts`.

**Prices in the static HTML** come from the live `/api/config` at build time. If you change prices with app settings, redeploy (or re-run the workflow) so the prerendered pages match.

---

## 3. Email with Resend, and receiving mail

**Status: ✅ done.** Resend has verified `inbunden.com` (DKIM on `resend._domainkey`, bounce records on `send`), DMARC is `p=none`, and the app sends from `Inbunden <hello@inbunden.com>`. Incoming mail: a Loopia e-mail alias forwards `hello@inbunden.com` to your Gmail through Loopia's own MX (`mailcluster.loopia.se`, `mail2.loopia.se`). Confirm with the checks in step 6.

Without Resend, emails are only written to the Functions log. That covers return links, "your book is ready", password reset and the deletion reminders.

**You need:** a Resend account (the free tier is 3 000 emails/month) and DNS access for `inbunden.com`.

1. **Resend → Domains → Add domain** `inbunden.com`, region EU.
2. Add the DNS records Resend shows: DKIM (`resend._domainkey` TXT), and the MX + SPF TXT on the `send` subdomain that Resend uses for bounces. They don't touch your own mailbox records. Add a DMARC TXT too: name `_dmarc`, value `v=DMARC1; p=none; rua=mailto:hello@inbunden.com`. Wait for **Verified**.
3. **Resend → API keys → Create** with *Sending access* only, limited to `inbunden.com`.
4. Apply it by changing only these three settings (the other settings stay as they are):
   ```powershell
   az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names EMAIL_PROVIDER=resend RESEND_API_KEY=<key> "EMAIL_FROM=Inbunden <hello@inbunden.com>"
   ```
   `az staticwebapp list -o table` shows the Static Web App name. Avoid re-running `deploy.ps1` just for this: it rewrites *every* app setting from its parameters, so any setting you don't pass again (Google keys, `APP_BASE_URL`, …) is reset.
5. **Receiving mail.** The About page and the email replies go to `hello@inbunden.com`, and Resend only sends. At Loopia: Kundzon → *Skapa en e-postadress* → *Skapa ett e-postalias för att vidarebefordra e-post till en annan e-postadress*, `hello@inbunden.com` → your own address. Loopia adds its MX records on `@` itself. In Gmail, add a filter for `to:hello@inbunden.com` with *Never send it to Spam*. Optional: Gmail → Settings → Accounts → *Send mail as* `hello@inbunden.com` via `smtp.resend.com`, port 465, user `resend`, a Resend API key as password.
6. Check that it worked:
   - On the waiting screen, enter your address under "Send me a link"; the return-link email arrives.
   - Place a test order; "Your book is ready" arrives.
   - The headers show `dkim=pass` and `spf=pass`.
   - A mail sent to `hello@inbunden.com` reaches you.

---

## 4. Real payments with Stripe

**Status: 🟡 test mode done** (checked 30 Sep 2026). The Inbunden Stripe account is set up and production runs `PAYMENT_PROVIDER=stripe` with test keys. `/api/config` returns a `pk_test_…` key, and all three Stripe settings are present. Steps 0–5 are done; **steps 6–7 (live keys) are left**. Before switching, run through the checks in step 5 on inbunden.com once the Stripe test-card box is deployed.

Stripe runs only when `PAYMENT_PROVIDER=stripe` **and** all three keys are set. It never switches on by itself because keys exist.

**You need:** a Stripe account with business details and a payout bank account. Stripe may ask for verification before live payouts.

**Already have Stripe for another product? Create a new account, not a new organisation.** Stripe requires a separate account for each website or product that runs on its own. Each account has its own statement descriptor, public business details, payouts, reports and API keys. That way customers see "INBUNDEN" on their card statement, not the other product's name, and the other product's keys, webhooks and payment settings stay untouched. An *organisation* is only an optional layer on top of several accounts, for combined reporting and team management. You don't need one, and you can create it later and add both accounts ([Stripe: multiple accounts](https://docs.stripe.com/get-started/account/multiple-accounts), [Organizations](https://docs.stripe.com/get-started/account/orgs)).

0. **Create the Inbunden account:**
   1. In the Dashboard, click the current account name (top left) → **New account**, and name it `Inbunden`. It lives under your existing login, and you switch between accounts from the same menu.
   2. Activate it with **Venueve AB** as the legal entity: organisation number, address, representative and bank account. If the other product is also Venueve AB, use the same company details and, if you like, the same bank account. If it belongs to a different company, that's fine: this account is still Venueve AB.
   3. **Settings → Business → Public details:**
      - Business name `Inbunden`, website `https://inbunden.com`, support email `hello@inbunden.com`.
      - Statement descriptor `INBUNDEN`. The shortened descriptor can also be `INBUNDEN`.
      - Link to the privacy policy (`https://inbunden.com/privacy`) and terms (`https://inbunden.com/terms`).
   4. **Settings → Branding:** icon `brand/inbunden-logo-square-512.png` and brand colour `#4A5FA8`, so Stripe's receipts and 3-D Secure pages match the site.
   5. A new account starts on Stripe's standard pricing and doesn't inherit anything special from your other account. Every step below happens in the **Inbunden** account. Check the account name at top left before copying keys or adding webhooks.

**First with Stripe test keys (recommended), on a preview or the production site:**

1. **Stripe Dashboard (Inbunden account) → Developers → API keys** in test mode or a sandbox: copy `pk_test_…` and `sk_test_…`.
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://inbunden.com/api/stripe/webhook` (or the `*.azurestaticapps.net` host before the domain works).
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.
   - Copy the **Signing secret** `whsec_…`.
3. **Settings → Payment methods → Payment method domains**: add every domain the site runs on (the `azurestaticapps.net` host and each custom domain). Apple Pay and Google Pay only show up on registered domains.
4. Switch the provider:
   ```powershell
   az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names PAYMENT_PROVIDER=stripe STRIPE_SECRET_KEY=<sk_test_…> STRIPE_PUBLISHABLE_KEY=<pk_test_…> STRIPE_WEBHOOK_SECRET=<whsec_…>
   ```
5. Check that it worked:
   - Checkout shows Stripe's card form (plus Apple Pay / Google Pay on supported devices). With test keys (`pk_test_…`), the "Test mode" pill stays in the header, and a "Stripe test mode" box above the card form lists Stripe's test cards with Copy buttons. Use any future expiry date, any CVC and any postcode.
   - Pay with `4242 4242 4242 4242`: the order becomes paid, the PDF builds, and Stripe → Webhooks shows `200` deliveries.
   - Pay with `4000 0025 0000 3155`: Stripe shows its 3-D Secure test page. Approve it and the order is paid.
   - Pay with `4000 0000 0000 0002` (declined) or `4000 0000 0000 9995` (insufficient funds): you see the reason and can retry.
   - A discount code still works. `WELCOME100` skips payment entirely.

**Then go live:**

6. Repeat steps 1–4 with **live** mode keys and a **live** webhook endpoint (live and test webhooks are separate). With live keys (`pk_live_…`) the "Test mode" pill and the test-card box disappear, and the landing page's structured data starts to include the €9 offer.
7. Before announcing:
   - Disable the test codes (`npx tsx scripts/promo.ts disable WELCOME100`, same for `TEST20`).
   - Make one real purchase with your own card, then refund it in Stripe. The order should show as refunded on its Done page.

---

## 5. Instagram connect (Meta App Review)

Until this is approved, the "Connect Instagram" card shows "coming soon" and everyone uses the export upload, which already works for all accounts.

**You need:**
- A Meta developer account.
- **Business verification** of your company (Meta Business Manager).
- The privacy policy URL `https://inbunden.com/privacy` and terms `https://inbunden.com/terms` (both built, English and Swedish).

1. **developers.facebook.com → My Apps → Create app.** Choose type *Business*, then add the **Instagram** product → *API setup with Instagram business login*.
2. Under *Instagram → API setup → Business login settings*, set:
   | Field | Value |
   | --- | --- |
   | OAuth redirect URI | `https://inbunden.com/api/instagram/callback` |
   | Deauthorize callback URL | `https://inbunden.com/api/instagram/deauthorize` |
   | Data deletion request URL | `https://inbunden.com/api/instagram/data-deletion` |
3. Copy the **Instagram app ID** and **Instagram app secret**.
4. Test with Standard Access first:
   - Add yourself and a few testers under **App roles → Roles → Instagram Testers**. Each tester accepts the invite in Instagram → Settings → Apps and websites.
   - Testers need a Creator or Business account.
   - Enable the feature, ideally on a PR preview environment first:
     ```powershell
     az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names FEATURE_CONNECT_ENABLED=true IG_APP_ID=<id> IG_APP_SECRET=<secret> IG_REDIRECT_URI=https://inbunden.com/api/instagram/callback
     ```
     `IG_REDIRECT_URI` must exactly match what you entered in step 2.
   - Check: Choose source → Connect Instagram → log in on Instagram → back in the app, the import runs and the photos show likes.
5. Submit **App Review** for `instagram_business_basic` (Advanced Access). You'll need:
   - Business verification completed.
   - The privacy policy URL `https://inbunden.com/privacy`, plus an app icon and category.
   - A screencast showing: log in on Instagram → grant permission → your posts appear → building a book from them.
   - A short text explaining the use: *"Users connect their own professional Instagram account to import their own posts into a printable photo book. We read media and captions only; nothing is posted."*
6. Once approved, `FEATURE_CONNECT_ENABLED=true` in production opens connect to everyone (`-ConnectEnabled` on the deploy, or `az staticwebapp appsettings set … --setting-names FEATURE_CONNECT_ENABLED=true`).

---

## 6. Google Photos import (Google OAuth verification)

The third source card. It works for every Instagram account, private ones included: the user has Instagram transfer their posts to Google Photos (Accounts Center → Transfer a copy of your information), then picks them in Google's Picker and Inbunden copies the selection. Captions and likes do not come along; dates are what Google Photos knows. The flag is on by default; the card stays hidden until the client ID and secret are set. Step-by-step console instructions: `docs/google-oauth-setup.md`.

**You need:**
- A Google Cloud project with the **Google Photos Picker API** enabled.
- The public privacy policy URL (same as for Meta) and ownership of the domain verified in Google Search Console.

1. **console.cloud.google.com → APIs & Services → Library**: enable *Google Photos Picker API*.
2. **OAuth consent screen**: user type *External*, app name Inbunden, support email, app logo, homepage `https://inbunden.com`, privacy policy `https://inbunden.com/privacy` and terms `https://inbunden.com/terms`, authorized domain `inbunden.com`. Add the scope `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Publish the app (it stays "unverified" with a warning screen and a 100-user cap until step 5).
3. **Credentials → Create credentials → OAuth client ID**, type *Web application*:
   | Field | Value |
   | --- | --- |
   | Authorized redirect URI | `https://inbunden.com/api/google/callback` (and the PR preview host while testing) |
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

Becoming a destination in Meta's "Transfer a copy of your information" tool would let any Instagram account, private ones included, push posts (with captions) straight to Inbunden. Nothing is built for it yet; the prerequisites are yours and take weeks, so start them early if you want this path (details and sources in `docs/research.md`):

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
- [x] Privacy policy and terms pages exist (`/privacy`, `/terms`). They name Venueve AB as the operator; add its organisation number before launch.
- [ ] Google OAuth client verified for the Picker scope before `FEATURE_GOOGLE_PHOTOS_ENABLED` goes on (section 6).
- [ ] Optional: Application Insights attached to the Static Web App (Monitoring) if you want server logs. It isn't provisioned by default, to keep the cost at €0.
