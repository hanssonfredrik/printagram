# Google OAuth client for the Google Photos import

The "Via Google Photos" card needs a Google OAuth client so users can sign in with Google and pick photos in Google Photos. The feature flag `FEATURE_GOOGLE_PHOTOS_ENABLED` is already on; the card appears as soon as the client ID and secret are set. Nothing here costs money.

While the site is not public you only need steps 1–5 (about 15 minutes). Verification (step 7) comes later, before the public launch.

## 1. Create a Google Cloud project

1. Go to https://console.cloud.google.com/ and sign in with the Google account that should own Inbunden's integration.
2. Top bar → project picker → **New project**. Name: `Inbunden`. Organisation: leave as is. **Create**, then select the new project.

## 2. Enable the Picker API

1. Left menu → **APIs & Services → Library**.
2. Search for **Google Photos Picker API** and open it.
3. Click **Enable**.

Do not enable the "Google Photos Library API"; it can no longer read a user's library and is not used.

## 3. Set up the consent screen (branding)

Google calls this **Google Auth Platform** in newer consoles and **OAuth consent screen** in older ones. Same thing.

1. Left menu → **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Get started**).
2. Fill in:
   | Field | Value |
   | --- | --- |
   | App name | `Inbunden` |
   | User support email | your email |
   | Audience / User type | **External** |
   | Developer contact email | your email |
3. **Create**. Leave the app in **Testing** mode for now. In Testing mode only listed test users can sign in, no verification is needed, and the token stays valid for the hour the import needs.

Logo, homepage, privacy policy and terms URLs are only required for verification (step 7). Skip them now.

## 4. Add the scope and yourself as a test user

1. **Data Access** (older console: *Scopes* on the consent screen) → **Add or remove scopes**.
2. In the filter box paste `photospicker.mediaitems.readonly`, tick
   `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`, then **Update** and **Save**.
3. **Audience** (older console: *Test users*) → **Add users** → your Google account (and anyone else who will test). Up to 100 addresses.

## 5. Create the OAuth client

1. **Clients** (older console: **Credentials → Create credentials → OAuth client ID**).
2. Application type: **Web application**. Name: `Inbunden web`.
3. Under **Authorised redirect URIs** add one line per environment you test on:

   | Environment | Redirect URI |
   | --- | --- |
   | Local (`start-local.ps1`) | `http://localhost:4280/api/google/callback` |
   | Azure Static Web App | `https://<your-swa-hostname>.azurestaticapps.net/api/google/callback` |
   | Custom domain, later | `https://inbunden.com/api/google/callback` |

   Google accepts plain `http` for localhost only. Every other host must be `https`, and the path must match exactly.
4. **Create**. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) and the **Client secret**. The secret is shown once; you can create a new one later if you lose it.

Authorised JavaScript origins can stay empty; the browser never talks to Google directly.

## 6. Put the keys where Inbunden reads them

**Locally:** in `api/local.settings.json` (git-ignored) set

```json
"FEATURE_GOOGLE_PHOTOS_ENABLED": "true",
"GOOGLE_CLIENT_ID": "1234567890-abc.apps.googleusercontent.com",
"GOOGLE_CLIENT_SECRET": "GOCSPX-...",
"GOOGLE_REDIRECT_URI": "http://localhost:4280/api/google/callback"
```

then restart `start-local.ps1`. The redirect URI must be the one you entered in step 5.

**In Azure:** pass the keys to the deploy script. It creates the Storage account and the Static Web App on the first run (see `docs/GO_LIVE.md` §1) and only updates settings afterwards. The flag is on by default, and `GOOGLE_REDIRECT_URI` is derived from the app's base URL:

```powershell
./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope -GoogleClientId <id> -GoogleClientSecret <secret>
```

Add `-AppBaseUrl https://inbunden.com` once the custom domain exists, plus any Stripe, Resend or Instagram keys you already pass. Then add the printed hostname's callback URL (`https://<name>.azurestaticapps.net/api/google/callback`) to the client in step 5 if you have not already.

Or set them in the portal: Static Web App → Environment variables → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

**Why not GitHub secrets?** The GitHub workflow only builds and uploads the code. Runtime settings live in the Static Web App's environment variables, which the workflow never touches (the deploy action cannot set them, and the runner has no Azure login). Stripe and Instagram keys work the same way. Two things follow:

- A GitHub secret would sit unused; the API reads `process.env` on the Static Web App.
- `infra/deploy.ps1` writes the whole settings block on every run, so pass `-GoogleClientId` and `-GoogleClientSecret` (like the Stripe and Instagram keys) each time you redeploy, or the values go back to empty. Keep them next to `infra/.secrets.prod.json` (git-ignored) so they are at hand.

**Check it works**

1. Open the app → Start your book → the third card **Via Google Photos** is visible → **Send via Google Photos**.
2. Click **My photos are in Google Photos — sign in with Google**. Google shows an "unverified app" warning while in Testing mode; click *Continue*. Choose the account you added as a test user.
3. Back in Inbunden click **Pick photos in Google Photos**. A Google Photos tab opens; pick a few photos and press **Done**. The tab closes, the copy runs, and the photos appear without captions.

If Google says `redirect_uri_mismatch`, the URI in step 5 and `GOOGLE_REDIRECT_URI` (or `APP_BASE_URL`) differ; fix either side so they match character for character.

## 7. Before the public launch: verification

In Testing mode only test users can sign in. To open it to everyone:

1. The privacy policy (`https://inbunden.com/privacy`) and terms (`https://inbunden.com/terms`) are live. Verify domain ownership in **Google Search Console** with the same Google account.
2. Consent screen / Branding: add the logo, homepage `https://inbunden.com`, privacy policy `https://inbunden.com/privacy`, terms `https://inbunden.com/terms`, and `inbunden.com` under authorised domains.
3. **Publish app** (Testing → In production), then **Prepare for verification** in the Verification Center.
4. Justify the scope in one or two sentences, for example: *"Users pick their own photos in Google Photos to build a printable photo book. Read-only; Inbunden only receives the photos the user selects."* Attach a short screen recording of the flow in step 6.
5. Google usually answers within a few business days. Until then the flow keeps working for test users, so nothing needs to be switched off.
