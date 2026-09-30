# Inbunden

Your Instagram, as a real book. Pick the photos, Inbunden lays out the pages and delivers a print-ready PDF (printed books coming later).

- **App**: React 19 + Vite + TypeScript, deployed to an Azure Static Web App (Free plan).
- **API**: Azure Functions (managed by Static Web Apps), Node 20, Table + Blob Storage.
- **Cost target**: ≈ €0/month until real usage; see `docs/architecture.md`.

## Naming

The product is called **Inbunden** (Swedish for "hardcover"; see the About page and `docs/inbunden-name-deep-dive.md`). It was called Printagram before, and some technical identifiers keep that name on purpose, because renaming them would break existing users or the deployment: the GitHub repo `hanssonfredrik/printagram`, the `@printagram/*` workspace packages, the browser storage keys `printagram.draft.v2` / `printagram.lang`, the `pg_session` cookie, and the Azure names (`printagram-rg`, Bicep `baseName`, `printagram-prod`).

## Quick start

```bash
./start-local.ps1    # Azurite + Functions + app → http://localhost:4280 (test payments)
```

Full stack, tests, provisioning and third-party setup: `docs/runbook.md`.

## Documents

| File | Content |
| --- | --- |
| `docs/user-stories.md` | Every user story with acceptance criteria and status |
| `docs/architecture.md` | Data model, blob/SAS policy, auth, payment gating, import jobs, cron |
| `docs/research.md` | Azure pricing/limits, Instagram API and export format, Stripe, email, print providers |
| `docs/runbook.md` | Local dev, deployment, Stripe/Resend/Meta setup, operations |
| `docs/crimson-print-on-demand.md` | Crimson print-on-demand API, book prices, alternatives, printed-book implementation plan |
| `docs/screenshots/` | Screens captured by the browser e2e run |
| `infra/` | Bicep + deploy script |

## Layout

```
shared/   types, pricing, page layout, export-ZIP schema
app/      SPA (routes, components, state, services, workers)
api/      Functions (functions/, lib/, emails)
scripts/  storage-setup, smoke (API), e2e (browser), fixtures, cron
```

## Scripts

| Command | What |
| --- | --- |
| `./start-local.ps1` (`npm run dev`) | Whole local stack on Azurite; `-SeedPromo`, `-Reset`, `-NoBrowser` |
| `./stop-local.ps1` | Free the local ports |
| `npm run azurite` / `npm run storage:setup` | Local storage emulator + tables/containers/CORS |
| `npm run lint` / `npm run typecheck` / `npm test` | Quality gates (also run in CI) |
| `npx tsx scripts/smoke.ts` | API end-to-end |
| `npx tsx scripts/e2e.ts` | Browser end-to-end (Playwright) |
| `npx tsx scripts/pdf-check.ts` | Build and inspect a sample print PDF |
| `npx tsx scripts/promo.ts` | Manage discount codes |

Fonts Lora, Albert Sans, Noto Sans and Noto Emoji are bundled under the SIL Open Font License (`app/public/fonts/`); the sRGB profile (`app/public/icc/`) and the landing illustrations (`app/public/samples/`) are CC0.
