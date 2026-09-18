# Runbook

## Local development

Prerequisites: Node 20 or 22 (the Functions worker rejects Node 24 — if your default is 24, keep a Node 22 install and point the host at it, see below), Azure Functions Core Tools v4 (`func`), Azure CLI (`az`), Docker not required.

```bash
npm install
```

### Mock mode (no backend, zero setup)

```bash
npm run dev            # http://localhost:5173 — in-memory API, seeded demo library, demo bar
```

Everything is clickable: connect (simulated), upload a **real** Instagram export ZIP (parsed in the browser), select, preview, mock payment, PDF generation and download.

### Full stack (Azurite + Functions + SWA emulator)

```bash
cp api/local.settings.example.json api/local.settings.json      # edit if needed
npm run azurite &                                               # Blob :10000, Table :10002
npm run storage:setup                                           # tables, pdfs container, CORS
npm run dev:api                                                 # builds api/dist and runs `func start` on :7071
npx swa start http://localhost:5173 --run "npm run dev:real -w app" --api-devserver-url http://localhost:7071
# → http://localhost:4280 (SPA + /api proxied)
```

If `func start` says *Incompatible Node.js version*, add to `api/local.settings.json` → `Values`:
`"languageWorkers__node__defaultExecutablePath": "C:/path/to/node22/node.exe"`.

Stripe webhooks locally: `stripe listen --forward-to http://localhost:7071/api/stripe/webhook` and copy the `whsec_…` into `STRIPE_WEBHOOK_SECRET`. Without Stripe keys the API runs in mock-payment mode (`POST /api/orders/{id}/mock-pay`).

### Tests

```bash
npm run lint && npm run typecheck
npm test                              # shared (10), app screens in happy-dom (14), api (7)
npx tsx scripts/make-fixtures.ts      # fixture export ZIPs → fixtures/
npx tsx scripts/smoke.ts              # API end-to-end against :7071 + Azurite (22 checks)
npx tsx scripts/e2e.ts                # headless Chromium against :5173 (mock) — writes docs/screenshots
APP_URL=http://localhost:4280 npx tsx scripts/e2e.ts   # same against the full stack
CRON_URL=http://localhost:7071 CRON_SECRET=change-me-random npx tsx scripts/cron.ts
```

## Provisioning (Azure)

```powershell
az login
./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope
```

Creates a Storage account and a Static Web App (Free), sets all app settings, and prints three GitHub secrets:
`AZURE_STATIC_WEB_APPS_API_TOKEN`, `CRON_URL`, `CRON_SECRET`. Add them under *Settings → Secrets and variables → Actions*, then push `main`. PR builds get preview environments.

To (re)configure services later, either rerun `deploy.ps1` with parameters (`-StripeSecretKey … -ResendApiKey … -ConnectEnabled`) or edit the Static Web App's environment variables in the portal / `az staticwebapp appsettings set`.

## Third-party setup

### Stripe
1. Create the account, copy `pk_…`/`sk_…` (test first).
2. Webhook endpoint `https://<host>/api/stripe/webhook`, events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`; copy the signing secret.
3. *Payment method domains*: register the SWA hostname and every custom domain (Apple Pay / Google Pay).

### Resend
1. Add and verify the sending domain (SPF, DKIM, DMARC records).
2. API key → `RESEND_API_KEY`, `EMAIL_FROM` → `Printagram <hello@yourdomain>`; `EMAIL_PROVIDER` becomes `resend` automatically when the key is set.

### Meta / Instagram (connect path)
1. developers.facebook.com → create an app → add *Instagram* → *API setup with Instagram business login*.
2. Redirect URI `https://<host>/api/instagram/callback`; Deauthorize callback `https://<host>/api/instagram/deauthorize`; Data deletion callback `https://<host>/api/instagram/data-deletion`.
3. Add yourself and testers as *Instagram Testers* (Standard Access) → set `IG_APP_ID`, `IG_APP_SECRET`, `FEATURE_CONNECT_ENABLED=true` on a preview environment and test.
4. Submit App Review for `instagram_business_basic` (Advanced Access): business verification, privacy policy URL, screencast. Only then enable the flag in production.

### Custom domain
Static Web App → Custom domains (2 on Free). Then redeploy with `-AppBaseUrl https://printagram.app -ExtraCorsOrigins https://printagram.app,https://www.printagram.app` so emails, OAuth and Blob CORS use the new origin.

## Operations

- **Cron**: runs daily from GitHub Actions; trigger manually via *Actions → Scheduled maintenance → Run workflow*. Public repos disable scheduled workflows after 60 days without commits — keep the repo private or push occasionally.
- **Logs**: attach Application Insights to the Static Web App (Monitoring) when needed; not provisioned by default to stay at €0.
- **Rotate a secret**: Storage → regenerate key 2, update `STORAGE_CONNECTION_STRING`, then regenerate key 1. JWT secret rotation signs everyone out.
- **Delete a user (GDPR request)**: the user can call `DELETE /api/account` from a signed-in session (UI button is a future story); Ops can delete the `Accounts` partition and `lib-<id>` containers manually.
- **Bandwidth**: SWA Free serves the SPA/JSON only (100 GB/month). Photos and PDFs are served from Blob (100 GB/month free egress, then ≈ $0.087/GB).

## Cost watch

At launch expect < €1/month. Watch *Storage → Metrics → Transactions* (uploads dominate) and Blob capacity. Levers: upload only selected photos instead of whole exports; Cool tier for old PDFs (lifecycle rule already in place).
