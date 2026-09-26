# Infrastructure

Two Azure resources, both effectively free at low usage:

| Resource | SKU | Why |
| --- | --- | --- |
| Storage account | StorageV2, Standard_LRS, Hot | Blob containers `lib-<libraryId>` (photos + thumbs) and `pdfs`; Tables `Accounts`, `Photos`, `Lookups` |
| Static Web App | Free | Hosts the SPA and the managed Functions API under `/api` |

Everything is described in `main.bicep`; `deploy.ps1` wraps `az deployment group create`, generates the
three app secrets once (stored in `infra/.secrets.<env>.json`, git-ignored) and prints the GitHub secrets.

## First deployment

```powershell
az login
./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope
```

Then add the printed secrets to the GitHub repository and push `main`. The deploy workflow builds `shared`,
`app` and `api` and publishes them with `Azure/static-web-apps-deploy@v1` (`skip_app_build` / `skip_api_build`:
we ship exactly what CI built on `ubuntu-latest`, which matches the Linux runtime of managed Functions).

## App settings

All runtime configuration lives in the Static Web App's *Environment variables* (`az staticwebapp appsettings set`).
They are set by the Bicep deployment; change them in the portal or redeploy with new parameters.

| Setting | Purpose |
| --- | --- |
| `APP_BASE_URL` | Public URL used in emails and OAuth redirects |
| `STORAGE_CONNECTION_STRING` | Storage account (key-based; managed Functions have no managed identity) |
| `AUTH_JWT_SECRET`, `TOKEN_ENC_KEY`, `CRON_SECRET` | Session signing, Instagram token encryption at rest, cron endpoint key |
| `PAYMENT_PROVIDER` | `fake` (default: test cards, no money taken) or `stripe`. Never inferred from the keys |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Required when `PAYMENT_PROVIDER=stripe` |
| `PRINT_BLEED_MM` | Bleed added around every PDF page (default 4; 3 for Cloudprinter) |
| `PRICE_SOFTCOVER_FROM_CENTS`, `PRICE_HARDCOVER_FROM_CENTS` | "From" prices shown for printed books (coming soon) |
| `EMAIL_PROVIDER` (`console`/`resend`), `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `FEATURE_CONNECT_ENABLED`, `IG_APP_ID`, `IG_APP_SECRET`, `IG_REDIRECT_URI` | Instagram connect (needs Meta App Review) |
| `FEATURE_GOOGLE_PHOTOS_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Photos import via the Picker API. Flag defaults to true; the card shows once the client keys are set (`docs/GOOGLE_OAUTH_SETUP.md`) |
| `PRICE_BASE_CENTS`, `LIBRARY_RETENTION_DAYS`, `REMINDER_DAYS_BEFORE`, `MAX_PHOTOS_PER_LIBRARY` | Product rules (the PDF price is flat; the per-book photo limit is fixed in code at 999) |

## Custom domain

Free plan allows 2 custom domains with free SSL: Static Web App → Custom domains. Then:

1. Redeploy with `-AppBaseUrl https://printagram.app -ExtraCorsOrigins https://printagram.app,https://www.printagram.app`
   (Blob CORS must list every origin that uploads/downloads).
2. Register the domain under Stripe → Payment method domains (needed for Apple Pay / Google Pay).
3. Update `IG_REDIRECT_URI` in the Meta app dashboard and the redirect URI of the Google OAuth client.

## Scale-up path (when usage justifies it)

- SWA Standard (≈ €9/month): SLA, more custom domains, bring-your-own Functions app with timers/queues.
- Storage stays the same; Cosmos DB Table API is a drop-in for Azure Table Storage if query needs grow.
- Resend Pro when transactional email exceeds 3 000/month.
