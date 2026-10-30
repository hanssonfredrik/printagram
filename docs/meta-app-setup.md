# Meta app for "Connect Instagram"

## Status 30 Oct 2026: the app exists, but Meta closed the login route our code uses

The Meta app **Inbunden** was created on 30 Oct 2026 (app id `1063408666760429`, business portfolio Venueve AB, id `3805198633041018`, use case *Manage messaging & content on Instagram*). Venueve AB was already business verified. The permission `instagram_basic` was added to the use case; nothing else was configured, no login configuration was saved.

The dashboard then showed: **"API setup with Instagram login is not available for newer apps. Your app uses API setup with Unified login instead."** The code in `api/src/functions/instagram.ts` and `api/src/lib/instagramApi.ts` implements exactly that unavailable route (login on instagram.com, `graph.instagram.com`, scope `instagram_business_basic`, an Instagram app id). Meta's own overview now calls Instagram Login the setup for "existing Instagram Login integrations" and says new API features ship only for Unified Login. Apps created before the change keep it; ours cannot get it.

What is left for a new app, checked in the dashboard and in Meta's docs:

| | Unified Login (Meta's recommendation) | Facebook Login (Page-linked) |
| --- | --- | --- |
| How the person logs in | Instagram or Facebook credentials, then picks a **business portfolio** and the Instagram account in it | Facebook credentials |
| What the person must have | Professional Instagram account **plus a Meta business portfolio** (Business Manager). Facebook Page not needed. Meta's docs say they "select" a portfolio; whether the flow lets them create one on the spot is untested. | Professional Instagram account **linked to a Facebook Page** they administer. The old "Business Login for Instagram" dialog (`extras={"setup":{"channel":"IG_API_ONBOARDING"}}`) walks them through creating and linking the Page. |
| Dashboard configuration | Facebook Login for Business configuration, login variation *General*, **System-user access token**, asset Instagram account, permission `instagram_basic` | Configuration with **User access token** and `instagram_basic` (possible: the permission appears in the list once it is added to the use case) |
| Token | Business integration system-user token, belongs to the portfolio, can be set to never expire. Managed with the token management API. | User token, short-lived, exchanged for a 60-day long-lived one (same refresh pattern as today) |
| API | `https://www.facebook.com/dialog/oauth?client_id=<meta app id>&config_id=<config id>&redirect_uri=…&response_type=code&prompt=login`, code exchange at `graph.facebook.com/v26.0/oauth/access_token` with the **Meta** app id and secret, account id from `/me/assigned_instagram_accounts`, media from `graph.facebook.com/v26.0/<ig account id>/media` | Same dialog with `config_id`, then `/me/accounts?fields=instagram_business_account`, media from `graph.facebook.com` |
| Captions and likes | `like_count` comes through. `caption` is marked "Available for Instagram API with Facebook Login only" in Meta's IG Media reference; whether a Unified Login token gets it is unconfirmed and is the first thing to test | `caption` and `like_count` documented |
| Callbacks | *Facebook Login for Business → Settings*: Valid OAuth Redirect URIs, Deauthorize callback URL, Data Deletion Request URL (one place for both options) | Same |
| App Review | Advanced Access for `instagram_basic`; business verification done | Same |

Neither option is as light as the one we built for: today a creator with nothing but an Instagram account could connect; now they need a business portfolio or a Facebook Page. For Inbunden's audience that is a real hurdle, and the export ZIP route already works for everyone.

Full research with sources: `docs/instagram-auth-research-2026-10.md` (30 Oct 2026).

**Decided 30 Oct 2026:** the export stays the default for every account, and no more work goes into the Instagram Login code path. Next is the Unified Login test below (captions on a system-user token, and what the dialog shows an account without a business portfolio) before any connect code is rewritten.

**Decision needed before more code is written.** Options:

1. **Try Unified Login for real.** Create the configuration (system-user token, `instagram_basic` only), add your Instagram account as a tester, open the login URL once from an Instagram account that has no business portfolio, and see whether Meta offers to create one inline. If it does, rewrite the connect code for Unified Login (new OAuth URL and host, `config_id`, token management, no 60-day refresh). If it does not, every user would first have to set up Business Manager, and option 3 is the honest answer.
2. **Facebook Login with Page onboarding.** Works for anyone with a Facebook account and lets them create the Page in the dialog, but Inbunden would show a Facebook login to Instagram users. Same code rewrite size as option 1.
3. **Park connect.** Keep `FEATURE_CONNECT_ENABLED=false`, keep the card as "Coming soon" or change it to point at the export, and revisit when Meta's data-portability route (`docs/go-live.md` §7) or a lighter login exists.

The sections below describe the dashboard as it looked on 30 Oct 2026. Steps 1 and 2a are done. Steps 2b to 6 were written for the Instagram Login route and apply only in their general shape (testers, App Review text, screencast, publish); the URL and token details change with the option chosen.

---

The "Connect Instagram" card needs a Meta app with the Instagram product, so users with a professional Instagram account can log in on Instagram and let Inbunden import their posts. The code is finished and sits behind `FEATURE_CONNECT_ENABLED`. This guide covers the Meta side: creating the app, testing it with your own account, and getting Meta's App Review approval so anyone can use it.

Order of work, slowest first:

| # | Step | Who | Takes |
| --- | --- | --- | --- |
| 1 | [Business verification](#1-business-verification) | done: Venueve AB shows "Business verification complete" (checked 30 Oct 2026) | |
| 2 | [Create the app](#2-create-the-app) | done 30 Oct 2026 (app id 1063408666760429); login route still to choose, see the status above | |
| 3 | [Instagram Testers](#3-add-instagram-testers) | you | 5 min |
| 4 | [Test on a preview environment](#4-test-on-a-preview-environment) | you set the settings, we test together | 30 min |
| 5 | [App Review](#5-app-review) | together, you submit | 1 h to prepare, days to weeks at Meta |
| 6 | [Publish](#6-publish) | you | 5 min + redeploy |

Nothing here costs money. Meta's review is the slow part.

The developer dashboard changed in 2026. Apps are now built around **use cases** instead of app types, the left menu is grouped into *Build your app* (Use cases, Settings, App Roles), *Review* (Testing, Verification, App Review) and *Publish*, and the old "Other → Business" app type is marked "going away soon". This guide follows the new layout. If a label differs from what you see, the dashboard moved it again; the setting itself is still there.

## What the app does, in Meta's words

- Product: **Instagram**, setup **API setup with Instagram business login** (Meta's name: "Instagram API with Instagram Login"). No Facebook Page is involved and users never see a Facebook login.
- Permission: `instagram_business_basic` only. It gives the username, account type, and the media list with captions, like counts, timestamps and image URLs. Nothing is posted, no comments or insights are read.
- Who can use it: only **professional** Instagram accounts (Business or Creator). Personal accounts get an explanation and the export route instead (`error=personal` in `api/src/functions/instagram.ts`).
- Access levels: **Standard Access** works for anyone with a role on the app (you, Instagram Testers). **Advanced Access** is what App Review grants and is needed for the public.

## 1. Business verification

Meta only grants Advanced Access to apps owned by a verified business. **This is done:** the Create app wizard lists the business portfolio **Venueve AB** with "Business verification complete" (seen 30 Oct 2026). Nothing to do here.

For the record, if it ever needs redoing: https://business.facebook.com/ → **Settings → Security Center → Business verification**, with the legal details as on the Bolagsverket registration and one document showing name and address (registreringsbevis, a utility bill or a company bank statement). The domain `inbunden.com` can also be verified under **Brand Safety and Suitability → Domains** with a DNS TXT record at Loopia; optional, but cheap.

## 2. Create the app

Do this at https://developers.facebook.com/apps/ signed in with the personal Facebook account that has access to the Venueve AB portfolio (the Gmail profile in Chrome).

### 2a. The Create app wizard

**My Apps → Create app.** A dialog says "There's a new way to create apps with Meta"; click **Create app** in it to continue. The wizard then has five steps:

| Step | What to pick |
| --- | --- |
| App details | App name `Inbunden`. App contact email: the wizard prefills your Gmail; change it to `hello@inbunden.com` if you want Meta's policy mail there. Both can be changed later under Settings. |
| Use cases | Tick **Manage messaging & content on Instagram** ("Publish posts, share stories, respond to comments, answer direct messages and more with the Instagram API"). It is under *All (20)* or *Content management*, not in *Featured*. Do **not** pick *Other*: it creates the app in the old experience and is marked "going away soon". Do not pick *Create an app without a use case* either. |
| Business | Select **Venueve AB** (Business verification complete). |
| Requirements | Shows "No requirements identified". Fine; the real requirements appear on the dashboard after creation. |
| Overview | Check: name Inbunden, use case Manage messaging & content on Instagram, business Venueve AB. **Create app** accepts the Meta Platform Terms and Developer Policies, so you click it. |

### 2b. Trim the use case to one permission

The use case adds two permissions by default: `instagram_business_basic` and `instagram_business_manage_messages`. We only need the first.

1. **Dashboard → Manage messaging & content on Instagram → Customize** (also under **Use cases → Customize**).
2. Under *Permissions and features*, remove `instagram_business_manage_messages`. Keep `instagram_business_basic`. Do not add anything else; every extra permission means more App Review questions.
3. In the left menu under the use case, pick **API setup with Instagram login** (Meta's name for "Instagram API with Instagram Login"). An app can only have one of the two setups; never pick *API setup with Facebook login*.

### 2c. Instagram login settings

On the **API setup with Instagram login** page:

1. **1. Generate access tokens → Add account.** Add the professional Instagram account you will test with (this also makes it a tester; see step 3).
2. **2. Configure webhooks.** Skip. We do not use webhooks, and a webhook callback that fails verification blocks nothing we need.
3. **3. Set up Instagram business login → Set up.** Enter the redirect URL `https://inbunden.com/api/instagram/callback` and save. Then open **Business login settings** and fill in:
   | Field | Value |
   | --- | --- |
   | OAuth redirect URIs | `https://inbunden.com/api/instagram/callback` and, while testing, the PR preview host: `https://<preview-host>.azurestaticapps.net/api/instagram/callback` |
   | Deauthorize callback URL | `https://inbunden.com/api/instagram/deauthorize` |
   | Data deletion request URL | `https://inbunden.com/api/instagram/data-deletion` |

   Meta's own docs warn that the dashboard "might have added a trailing slash" to a redirect URI. Check after saving: every URI must match the app setting `IG_REDIRECT_URI` character for character, and our callback has no trailing slash. Meta accepts several redirect URIs; each environment uses the one in its own `IG_REDIRECT_URI`.
4. Copy the **Instagram app ID** and **Instagram app secret** shown on this page. They are not the same as the app ID and secret under *Settings → Basic*; we use the Instagram pair. Keep them with `infra/.secrets.prod.json`, never in the repo.

### 2d. Settings → Basic

In the left menu, **Settings → Basic** (App Review later checks these under "Complete App Settings"):

| Field | Value |
| --- | --- |
| Display name | `Inbunden` |
| App domains | `inbunden.com` |
| Privacy policy URL | `https://inbunden.com/privacy` |
| Terms of service URL | `https://inbunden.com/terms` |
| User data deletion | *Data deletion callback URL*: `https://inbunden.com/api/instagram/data-deletion` |
| App icon | `brand/inbunden-logo-square-512.png` (Meta wants 1024 × 1024; export the SVG `brand/inbunden-logo-square.svg` at that size if the 512 one is refused) |
| Category | Photo, or Utility and productivity |
| Business portfolio | **Venueve AB**, already set by the wizard |

What the three URLs do in our code (`api/src/functions/instagram.ts`):

- **Callback** turns the code into a long-lived token (60 days), checks the account type, creates or reuses the user's connect library and sends the browser back to `/connect?connected=1`. On a problem it sends `?error=denied|personal|expired|unknown`.
- **Deauthorize** gets a signed request when the user removes Inbunden under Instagram → Settings → Apps and websites. We drop the token and mark the library disconnected.
- **Data deletion** gets a signed request when the user asks Instagram to delete their data. We delete the library with its photos and answer with a confirmation code and the status URL `https://inbunden.com/privacy/deletion?code=…`, which shows a confirmation page in English and Swedish. App Review opens this URL, so it must load.

## 3. Add Instagram Testers

Standard Access only works for accounts with a role on the app.

1. Either **App Roles → Roles → Add people → Instagram Tester** with the account's username, or **API setup with Instagram login → Generate access tokens → Add account** (step 2c), which does the same and shows a token you can try in the Graph API Explorer.
2. In the Instagram app, that account accepts the invite: **Settings → Apps and websites → Tester invites** (on the web: instagram.com → Settings → Apps and websites).
3. The account must be **Business** or **Creator**. Switch in Instagram → Settings → Account type and tools. Professional accounts can't be private, so this is the same requirement users have.

## 4. Test on a preview environment

Use a pull request preview so production keeps showing "Coming soon" until Meta approves.

1. Open a PR (any small change). GitHub Actions deploys it to `https://<swa-name>-<pr-number>.<region>.azurestaticapps.net`. The exact host is in the workflow log or under *Environments* on the Static Web App.
2. Add that host's callback to the OAuth redirect URIs in step 2c.
3. Set the preview environment's settings (portal → Static Web App → Environments → the PR → Environment variables, or `az staticwebapp appsettings set … --environment-name <pr-number>`):
   ```
   FEATURE_CONNECT_ENABLED=true
   IG_APP_ID=<instagram app id>
   IG_APP_SECRET=<instagram app secret>
   IG_REDIRECT_URI=https://<preview-host>/api/instagram/callback
   APP_BASE_URL=https://<preview-host>
   ```
   `IG_REDIRECT_URI` can be left out when `APP_BASE_URL` points at the preview host, because the API derives it from `APP_BASE_URL` (`api/src/lib/config.ts`). Preview environments do not inherit production's settings, so copy the storage connection string and the other secrets you need there too.
4. Redeploy the preview (push a commit or rerun the workflow) so the prerendered pages pick up `connectEnabled` from `/api/config`.
5. Run through the flow with the tester account:
   - Start your book → **Connect Instagram** → "Connect" sends you to instagram.com, you log in and allow → you land on `/connect` with the import running.
   - Posts appear newest first, carousels become several photos, videos are skipped.
   - Captions and like counts: open the Functions log for the preview (portal → Static Web App → Functions → Monitor, or Application Insights if attached) and find the lines starting with `instagram import`. Each run logs how many items had a caption and a like count. If the caption count stays at 0 on an account that has captions, Meta restricts captions to Facebook Login, and the connect card must stop promising captions (`app/src/i18n/{en,sv}/choose.ts`, the `when: 'connect'` bullets).
   - Build a book, open Checkout, pay with a test card (or a 100 % discount code), download the PDF.
   - Remove Inbunden under Instagram → Settings → Apps and websites. The next import on `/connect` shows the "connect again" error, and the Functions log shows the deauthorize call.
   - Open `https://<preview-host>/privacy/deletion?code=test` in both languages: a confirmation page with the code, and `noindex` in the page source.
6. Also try a personal account if you have one: Instagram either refuses the login or the callback sends you back with `error=personal`, and the screen points to the export route.

Write down from the test run: the caption and like counts, a screen recording (see step 5), and anything that looked odd.

## 5. App Review

Submit once the test run passed (business verification is already done).

1. **Review → Testing**: click **Ready to test** on the Instagram use case. Meta requires every use case to be marked tested before App Review opens, and this is where it records that the tester account made real API calls (the import in step 4 counts).
2. **Review → App Review**: the first item is **Complete App Settings** (app icon, privacy policy URL, category, step 2d). Then **Go to App Review**, confirm the listed requirements, and for `instagram_business_basic` describe the use case. Uncheck everything you do not need: *Human Agent* and any messaging permission the wizard added. You end up under **App Review → Requests**.
3. Fill in the request form. Suggested text, in English:

   > **How does your app use this permission?**
   > Inbunden lets a person turn their own Instagram posts into a printable photo book (PDF). After the person logs in with their professional Instagram account, we read their own media list (image URLs, captions, like counts and dates) with `instagram_business_basic`, copy the images to our storage and lay them out as book pages the person can edit and download. We read only the logged-in person's own media. We never post, comment, read insights or access anyone else's account. Tokens are encrypted at rest, refreshed while the person uses the service and deleted when the person disconnects, deletes their account, or when the library expires after 90 days.

   > **Step-by-step instructions for the reviewer**
   > 1. Open https://inbunden.com/start and choose "Connect Instagram".
   > 2. Click "Connect". You are sent to instagram.com. Log in with the test account below and allow access.
   > 3. You return to https://inbunden.com/connect. Your posts load with likes and captions.
   > 4. Click "Continue" to pick photos, then "Preview" to see the book, then download the PDF (the discount code below makes the PDF free).
   > 5. To test deletion: in Instagram → Settings → Apps and websites, remove Inbunden, or send a data deletion request. The confirmation page is https://inbunden.com/privacy/deletion?code=…

   The reviewer tests against production, so production must have the Instagram settings set and the flag on at review time. With the app still in Development mode only testers can log in, so the public still sees "Coming soon" until step 6. Set `FEATURE_CONNECT_ENABLED=true` in production right before you submit, and redeploy.
4. **Test credentials.** Meta wants a login the reviewer can use. Create a professional Instagram account for this (for example `inbunden.review`) with 10 to 20 public posts, add it as an Instagram Tester, and give its username and password in the form. Turn two-factor authentication off on that account. Create a discount code for the reviewer with `npx tsx scripts/promo.ts create REVIEW100 percent 100 --max 20` so they can download without paying; disable it after approval.
5. **Screencast.** Record one video, 2 to 3 minutes, no cuts, with the browser's address bar visible:
   1. inbunden.com landing page → Start → the source cards.
   2. Connect Instagram → Connect → instagram.com login → the permission screen showing "Inbunden" and the requested permission → Allow.
   3. Back on `/connect`: posts appear, likes shown.
   4. Select photos → Preview → Checkout with the discount code → Download PDF → open the PDF.
   5. Instagram → Settings → Apps and websites → remove Inbunden → back in Inbunden, the connect screen asks to connect again.
   Tools: Windows Game Bar (Win+G) or OBS, 1080p, MP4.
6. **Data handling questions** (Meta asks these in the Data Use Checkup or the form): data is stored in Azure (West Europe), encrypted at rest, kept only for the person's own book, deleted on request right away and automatically after 90 days. The privacy policy at https://inbunden.com/privacy describes this. Check the policy still matches before you submit.
7. **Submit.** Meta usually answers within 5 business days, sometimes longer. Common rejections and what to do:
   - *"We could not log in"*: the test account's password changed, or two-factor authentication is on.
   - *"Screencast does not show the permission being used"*: the video must show the Instagram permission screen and then the posts loading.
   - *"Privacy policy URL not valid"*: the page must be reachable without JavaScript. Ours is prerendered; check `curl https://inbunden.com/privacy` shows the text.
   - *"Business verification required"*: the app is not linked to the Venueve AB portfolio. Check **Settings → Basic → Business portfolio**.
8. While under review the app stays unpublished and testers keep working.

## 6. Publish

After approval:

1. **Publish** in the left menu, then the **Publish** button bottom right. If it sends you back to settings, something under "App customization and requirements" on the Dashboard is still open; each item there must show complete. This replaces the old Development/Live mode toggle.
2. Set the production settings (you do this; it changes Azure):
   ```powershell
   az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names FEATURE_CONNECT_ENABLED=true IG_APP_ID=<id> IG_APP_SECRET=<secret> IG_REDIRECT_URI=https://inbunden.com/api/instagram/callback
   ```
   If you later rerun `infra/deploy.ps1`, pass the Instagram parameters too, or the values are reset.
3. Redeploy (push to `main` or rerun the workflow) so the prerendered FAQ, guides and connect card switch from "Coming soon" to the live copy.
4. Check:
   - `https://inbunden.com/api/config` returns `"connectEnabled":true`.
   - The connect card shows the button, and `/connect` works with a professional account that is not a tester.
   - The daily cron refreshes tokens: `refreshIgTokens` in the workflow log after the first night.
5. Update the status line in `docs/go-live.md` §5 and stories 3.4 and 3.11 in `docs/user-stories.md`.

## Keeping it working

- **Token refresh.** Long-lived tokens last 60 days. The daily cron (`refreshIgTokens` in `api/src/functions/cron.ts`) refreshes every token that expires within 30 days. A refresh that fails marks the token invalid, and the user sees "connect again" on the next import.
- **API version.** Calls are pinned to `v26.0` in `api/src/lib/instagramApi.ts`. Meta keeps a version about two years. When the developer dashboard warns about deprecation, bump the constant and run `api/test/instagram.test.ts`.
- **Data Use Checkup.** Meta asks once a year to confirm how the permission is used. The dashboard shows a banner; answer it or the app loses access.
- **Changing the URLs.** If the domain changes, update the three URLs in step 2c and `IG_REDIRECT_URI` the same day. A mismatch gives `redirect_uri` errors on login.
