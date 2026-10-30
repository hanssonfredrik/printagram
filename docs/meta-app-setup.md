# Meta app for "Connect Instagram"

The "Connect Instagram" card lets a person with a Creator or Business account bring in their posts without the export ZIP. Since 30 Oct 2026 it uses Meta's **Unified Login**: Facebook Login for Business with a login configuration that hands Inbunden a read-only token for the Instagram account the person picks. The code is done and sits behind `FEATURE_CONNECT_ENABLED`. This guide is the Meta side: what is already set up, what is left for you, the test run, and the App Review package.

Why Unified Login: Meta no longer gives new apps the Instagram Login route ("API setup with Instagram login is not available for newer apps"), and the other route needs a Facebook Page. The full comparison with sources is in `docs/instagram-auth-research-2026-10.md`. The export stays the default for everyone; connect is the quick route for people who already run a Creator or Business account.

## What the person sees

1. On Inbunden: Start → **Connect Instagram** → Continue.
2. Meta's window opens. They log in with their Instagram account (or Facebook), choose the **business portfolio** that holds their Instagram account, tick the account and allow read access. Each choice is made automatically when there is only one.
3. They land back on `/connect`, and the import runs: photos, dates, like counts and, if Meta delivers them, captions.

Requirements on their side: a Creator or Business account that belongs to a Meta business portfolio. If none comes through, the callback answers `error=noaccount` and the screen points to the export.

## What is set up (30 Oct 2026)

| Item | Value |
| --- | --- |
| App | **Inbunden**, app id `1063408666760429`, business portfolio Venueve AB (`3805198633041018`, business verification complete) |
| Use case | *Manage messaging & content on Instagram*, permission `instagram_basic` added |
| Login configuration | **Inbunden connect**, configuration id `1665439111774577`: login variation General, system-user access token, expiry 60 days, asset Instagram accounts (required), permission `instagram_basic` only |
| Facebook Login for Business → Settings | Valid OAuth redirect URI `https://inbunden.com/api/instagram/callback`, deauthorize callback `https://inbunden.com/api/instagram/deauthorize`, data deletion request URL `https://inbunden.com/api/instagram/data-deletion` (checked: no trailing slash) |
| App settings → Basic | Display name Inbunden, privacy policy `https://inbunden.com/privacy`, terms `https://inbunden.com/terms`, data deletion callback URL as above, category *Utility and productivity* |

The dashboard is in Swedish for this account: Översikt, Användningsfall, Facebook-inloggning för företag (Inställningar, Configurations), Testar, Publicera, App settings (Allmänt, Avancerat), App roles (Roller).

## 1. Left for you in the dashboard

1. **App settings → Basic (Allmänt):** add the app domain `inbunden.com` and upload the app icon `brand/inbunden-logo-square-512.png`, then Save. Meta asks for your Facebook password when saving the domain, which is why this is yours. Change the contact email to `hello@inbunden.com` if you want Meta's policy mail there.
2. **App secret:** Basic → App secret → Show. Keep it with `infra/.secrets.prod.json`, never in the repo.

## 2. Settings in Azure

The API needs the Meta app id and secret and the configuration id (`api/src/lib/config.ts`). You set them; nothing here runs from Claude.

```powershell
az staticwebapp appsettings set -n <swa name> -g printagram-rg --setting-names IG_APP_ID=1063408666760429 IG_APP_SECRET=<app secret> IG_CONFIG_ID=1665439111774577 IG_REDIRECT_URI=https://inbunden.com/api/instagram/callback FEATURE_CONNECT_ENABLED=true
```

If you later rerun `infra/deploy.ps1`, pass `-ConnectEnabled -IgAppId … -IgAppSecret … -IgConfigId …`, or the values are reset.

Until Meta approves the permission, only people with a role on the app (you, plus anyone added under App roles → Roller) can finish the Meta window. Everyone else gets an error from Meta. So either test on a pull request preview (same settings on the preview environment, plus its callback added to the redirect URIs), or switch the flag on in production for the test and off again right after, then on again from step 4 onward. Redeploy after changing the flag so the prerendered pages pick up `connectEnabled`.

## 3. Test run

You need a role on the app (you are admin) and an Instagram Creator or Business account inside a business portfolio you manage. If your Instagram is in no portfolio yet: business.facebook.com → Settings → Accounts → Instagram accounts → Add, inside Venueve AB or a new portfolio.

1. inbunden.com → Start → **Connect Instagram** → Continue. Log in in Meta's window, choose the portfolio and the account, allow.
2. You land on `/connect` with the import running. Posts appear newest first, carousels become several photos, videos are skipped.
3. **Captions.** Open the Functions log (portal → Static Web App → Functions → Monitor, or Application Insights) and find the lines `instagram import <job>: … with a caption and … with a like count`. Meta's reference marks `caption` as "Facebook Login only". If the caption count stays at 0 on an account that has captions, the connect card must stop promising captions (`app/src/i18n/{en,sv}/choose.ts` and `connect.ts`); tell Claude and it changes the copy, or we switch to the Page-linked configuration.
4. **No portfolio.** If you can, try an Instagram account that is in no portfolio and note exactly what the Meta window shows. If it offers to create one, the connect card can say so; if it dead-ends, the `noaccount` message already points to the export.
5. Build a book, pay with the 100 % code (`npx tsx scripts/promo.ts create REVIEW100 percent 100 --max 20`), download the PDF.
6. Remove the app: business.facebook.com → Settings → Integrations → Connected apps → Inbunden → Remove. The next import on `/connect` shows "Connect Instagram again". Note whether the deauthorize callback was called (Functions log); Meta does not document it for system-user tokens.
7. Open `https://inbunden.com/privacy/deletion?code=test` in both languages: a confirmation page with the code, and `noindex` in the page source.

Record the screencast for step 4 below during this run if it went well.

## 4. App Review

1. **Översikt → Become a Tech Provider** if the card is still there. Meta gates App Review behind it; Access Verification was retired on 9 Oct 2026, so this is a short form.
2. **Testar (Testing):** click **Ready to test** on the Instagram use case. The API calls from the test run count.
3. **App Review:** the first item is *Complete App Settings* (icon, privacy policy, category; step 1). Then request **Advanced Access for `instagram_basic`**. Ask for nothing else.
4. Use-case text, in English:

   > **How does your app use this permission?**
   > Inbunden turns a person's own Instagram posts into a printable photo book (PDF). The person logs in through our Facebook Login for Business configuration and shares their own Instagram professional account. With `instagram_basic` we read that account's media list (image URLs, captions, like counts and dates), copy the images to our storage and lay them out as book pages the person can edit, preview and download. We read only the shared account's own media. We never post, comment, message, read insights or access any other account. The token is encrypted at rest and deleted after 60 days, when the person disconnects, or when they delete their Inbunden account. Copied photos are deleted after 90 days, or right away on request.

   > **Step-by-step instructions for the reviewer**
   > 1. Open https://inbunden.com/start and choose "Connect Instagram", then "Continue".
   > 2. In Meta's window, log in with the test account below, choose its business portfolio and Instagram account, and allow access.
   > 3. You return to https://inbunden.com/connect and the posts load.
   > 4. Click "Continue" to pick photos, then "Preview" to see the book. At checkout use the discount code below; the PDF downloads for free.
   > 5. Data deletion: remove Inbunden from the business portfolio (Business settings → Integrations → Connected apps), or send a data deletion request. The status page is https://inbunden.com/privacy/deletion?code=…

5. **Test credentials.** The reviewer needs an Instagram professional account inside a business portfolio. Create a Creator account for this (for example `inbunden.review`) with 10 to 20 public posts, put it in a test business portfolio, turn two-factor authentication off, and give its login in the form with the `REVIEW100` code. Disable the code after approval.
6. **Screencast**, 2 to 3 minutes, no cuts, address bar visible: inbunden.com → Start → Connect Instagram → Meta's window with "Inbunden" and the requested access → portfolio and account choice → Allow → posts loading on `/connect` → Preview → Checkout with the code → download and open the PDF → remove the app in Business settings → back in Inbunden the screen asks to connect again. Windows Game Bar (Win+G) or OBS, 1080p, MP4.
7. **Data handling questions:** data stored in Azure West Europe, encrypted at rest, used only for the person's own book, token deleted after 60 days, photos after 90 days or on request. The privacy policy at https://inbunden.com/privacy says this; check it still matches.
8. Production must have the settings from step 2 and the flag on while Meta reviews, since the reviewer uses inbunden.com. Meta usually answers within a week. Common rejections:
   - *"We could not log in"*: the test account's password changed or two-factor authentication is on.
   - *"Screencast does not show the permission being used"*: show Meta's consent screen and then the posts loading.
   - *"Privacy policy URL not valid"*: the page must load without JavaScript; ours is prerendered.

## 5. Publish

After approval: **Publicera → Publish**. If it sends you back to settings, an item under "App customization and requirements" on Översikt is still open. Then check that `https://inbunden.com/api/config` returns `"connectEnabled":true` and that someone without a role on the app can connect. Update `docs/go-live.md` §5 and stories 3.4 and 3.11 in `docs/user-stories.md`.

## How the code works

- **Start** (`api/src/functions/instagram.ts`, `instagramStart`) sends the browser to `https://www.facebook.com/v26.0/dialog/oauth` with the Meta app id, `config_id`, `response_type=code` and a signed state (`api/src/lib/instagramApi.ts`). No `scope`: the configuration decides the permissions.
- **Callback** trades the code at `graph.facebook.com/v26.0/oauth/access_token` for a system-user token, reads the shared accounts from `/me/assigned_instagram_accounts`, takes the first, and stores the token encrypted with an expiry of at most 60 days. No account shared → `error=noaccount`; Cancel → `error=denied`; anything else → `error=unknown`.
- **Import** reads `graph.facebook.com/v26.0/<instagram account id>/media` with captions, like counts and carousel children, 50 posts a page. A Meta error #190 marks the token invalid and the screen asks to connect again.
- **Expiry:** tokens are never refreshed. The nightly cron task `expireIgTokens` deletes tokens past their 60 days; the person connects again if they want newer posts. The library itself keeps its 90-day life.
- **Deauthorize and data deletion** accept Meta's signed request and look up the library by the Instagram account id and by the system user id. Which id Meta sends for a system-user token is not documented; the test run in step 3.6 shows it.
- Graph calls are pinned to `v26.0`. When the dashboard warns about deprecation, bump `API_VERSION` and run `api/test/instagram.test.ts`.
