# Runbook

## Local development

Prerequisites: Node 20 or 22 (the Functions worker rejects Node 24; with nvm, keep a 22 installed and `start-local.ps1` finds it), Azure Functions Core Tools v4 (`func`), PowerShell, Azure CLI (`az`) for provisioning. Docker is not required.

```bash
npm install
```

### Start everything (Windows, one command)

```powershell
./start-local.ps1              # Azurite + API + web app → http://localhost:4280
./start-local.ps1 -SeedPromo   # also creates the test codes WELCOME100 (100 %, once per user) and TEST20 (20 %)
./start-local.ps1 -Reset       # wipe local storage (.azurite/) first
./stop-local.ps1               # free the ports if something was left running
```

The script installs dependencies on first run, creates `api/local.settings.json` from the example with random secrets, finds a Node 20/22 for the Functions worker (via nvm or `NVM_HOME`; the worker rejects Node 24), checks the ports (10000–10002, 7071, 5173, 4280) and then runs, with prefixed logs:

| Process | What |
| --- | --- |
| `azurite` | Blob :10000, Queue :10001, Table :10002, data in `.azurite/` |
| `build` | esbuild watch → `api/dist/index.js` (the Functions host reloads on change) |
| `func` | storage setup (tables, `pdfs` container, CORS), then `func start` on :7071 |
| `vite` | the app on :5173 |
| `web` | SWA CLI on :4280: the app plus `/api` proxied to :7071, like production |

Ctrl+C stops everything. If any process fails, the others are stopped too. Emails (return links, "your book is ready", reminders) go to the console mailer and show up in the `func` log.

Flags: `-NoBrowser`, `-Force` (stop whatever holds the ports without asking), `-Reset`, `-SeedPromo`.

### Payments locally

`PAYMENT_PROVIDER=fake` (the default everywhere): Checkout shows a "Test payment - no money is taken" banner and three read-only test cards. The server decides the outcome:

| Card | Outcome |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0000 0000 9995` | insufficient funds |

To try Stripe instead, set `PAYMENT_PROVIDER=stripe` plus `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET`, then forward webhooks with `stripe listen --forward-to http://localhost:7071/api/stripe/webhook`. The API refuses to start payments with `stripe` and missing keys. It never switches provider on its own.

### Discount codes

```bash
npx tsx scripts/promo.ts list
npx tsx scripts/promo.ts create SUMMER25 percent 25 --until 2026-12-31 --max 100
npx tsx scripts/promo.ts create FIVEOFF fixed 500 --once     # 500 cents = €5, once per user
npx tsx scripts/promo.ts create FEMTIO fixed 5000 --currency sek   # 50 kr, only on kronor orders
npx tsx scripts/promo.ts disable SUMMER25
npx tsx scripts/promo.ts seed          # WELCOME100 + TEST20
```

Percent codes work in both currencies. A fixed amount only applies to orders in its own currency (euros unless you pass `--currency sek`). The script uses Azurite by default. Set `STORAGE_CONNECTION_STRING` to manage codes in a real storage account.

### Tests

```bash
npm run lint && npm run typecheck
npm test                              # shared, app (happy-dom), api - API route tests need Azurite (skipped otherwise)
npx tsx scripts/make-fixtures.ts      # fixture export ZIPs → fixtures/
npx tsx scripts/pdf-check.ts out.pdf  # builds a sample book with the real PDF code and checks boxes, OutputIntent, images
npx tsx scripts/smoke.ts              # API end-to-end against the running stack
npx tsx scripts/e2e.ts                # headless Chromium against :4280 - writes docs/screenshots
CRON_URL=http://localhost:7071 CRON_SECRET=… npx tsx scripts/cron.ts
```

CI runs lint, typecheck, all unit tests, the API route tests against an in-memory Azurite and `pdf-check.ts` before deploying.

## Provisioning (Azure)

```powershell
az login
./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope
```

Creates a Storage account and a Static Web App (Free), sets all app settings, and prints three GitHub secrets:
`AZURE_STATIC_WEB_APPS_API_TOKEN`, `CRON_URL`, `CRON_SECRET`. Add them under *Settings → Secrets and variables → Actions*, then push `main`. PR builds get preview environments.

To (re)configure services later, either rerun `deploy.ps1` with parameters (`-PaymentProvider stripe -StripeSecretKey … -ResendApiKey … -ConnectEnabled`) or edit the Static Web App's environment variables in the portal / `az staticwebapp appsettings set`.

## Third-party setup

### Stripe
Stripe stays dormant until `PAYMENT_PROVIDER=stripe` is set together with the keys below.

1. Create the account, copy `pk_…`/`sk_…` (test first).
2. Webhook endpoint `https://<host>/api/stripe/webhook`, events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`; copy the signing secret.
3. *Payment method domains*: register the SWA hostname and every custom domain (Apple Pay / Google Pay).

### Resend
1. Add and verify the sending domain (SPF, DKIM, DMARC records).
2. API key → `RESEND_API_KEY`, `EMAIL_FROM` → `Inbunden <hello@yourdomain>`; `EMAIL_PROVIDER` becomes `resend` automatically when the key is set.

### Meta / Instagram (connect path)
1. developers.facebook.com → create an app → add *Instagram* → *API setup with Instagram business login*.
2. Redirect URI `https://<host>/api/instagram/callback`; Deauthorize callback `https://<host>/api/instagram/deauthorize`; Data deletion callback `https://<host>/api/instagram/data-deletion`.
3. Add yourself and testers as *Instagram Testers* (Standard Access) → set `IG_APP_ID`, `IG_APP_SECRET`, `FEATURE_CONNECT_ENABLED=true` on a preview environment and test.
4. Submit App Review for `instagram_business_basic` (Advanced Access): business verification, privacy policy URL, screencast. Only then enable the flag in production.

### Custom domain
`inbunden.com` on the Static Web App; `www.inbunden.com` and `inbunden.se` forwarded at the registrar; full steps in `docs/go-live.md` §2. Then redeploy with `-AppBaseUrl https://inbunden.com -ExtraCorsOrigins https://inbunden.com` so emails, OAuth and Blob CORS use the new origin.

## Operations

- **Cron**: runs daily from GitHub Actions; trigger manually via *Actions → Scheduled maintenance → Run workflow*. Public repos disable scheduled workflows after 60 days without commits - keep the repo private or push occasionally.
- **Logs**: attach Application Insights to the Static Web App (Monitoring) when needed; not provisioned by default to stay at €0.
- **Rotate a secret**: Storage → regenerate key 2, update `STORAGE_CONNECTION_STRING`, then regenerate key 1. JWT secret rotation signs everyone out.
- **Google Analytics** (`G-JJQ0ZS1MSP`, `app/src/services/analytics.ts`): loads only on inbunden.com / www.inbunden.com and only after the visitor accepts the cookie banner (GDPR/LEK consent); GPC and Do Not Track count as declined. Ad features are denied via Consent Mode. In GA *Admin → Data retention*, set event data retention to 14 months to match the privacy policy. Changing the ID means updating the constant, the cookie name in `app/src/i18n/*/legal.ts`, and the CSP if Google's domains change.
- **Admin app**: users, orders, VAT report, visitors, promo codes, audit log. Setup, recovery (lost authenticator) and the security model are in `docs/admin.md`.
- **Delete a user (GDPR request)**: *Admin → Users → Delete user* (the same code as `DELETE /api/account`, which a signed-in user can also call).
- **Bandwidth**: SWA Free serves the SPA/JSON only (100 GB/month). Photos and PDFs are served from Blob (100 GB/month free egress, then ≈ $0.087/GB).

## Cost watch

At launch expect < €1/month. Watch *Storage → Metrics → Transactions* (uploads dominate) and Blob capacity. Levers: upload only selected photos instead of whole exports; Cool tier for old PDFs (lifecycle rule already in place).
