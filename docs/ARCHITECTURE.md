# Architecture

```
Browser (React 19 + Vite, TypeScript)
│  zip.js worker: parse export ZIP, extract images, 400 px thumbnails
│  pdf-lib worker: build the book PDF at print size
│  ─ JSON ─────────────────────────────►  /api/*  (same origin, HttpOnly cookie)
│  ─ PUT/GET with SAS ──────────────────►  Blob Storage  lib-<libraryId>/{orig,thumb}/…  pdfs/<orderId>/v<n>.pdf
│
Azure Static Web App (Free)
│  static SPA  +  managed Azure Functions (Node 20, HTTP only, 45 s)
│     ├─ Table Storage: Accounts (PK userId) · Photos (PK libraryId) · Lookups (PK kind)
│     ├─ Stripe (PaymentIntent, webhook)        ├─ Resend (email)
│     └─ Instagram Graph API (OAuth, /me/media, media copy)
│
GitHub Actions: deploy on push · daily cron → POST /api/cron/run
```

## Principles

1. **Two Azure resources only** (Storage account + SWA Free). No queues, timers, identities or Key Vault.
2. **Heavy bytes never touch Functions.** ZIP parsing, thumbnails, PDF rendering happen in the browser; photos and PDFs move browser ↔ Blob with short-lived SAS URLs. Functions do JSON, SAS minting, Stripe and bounded Instagram copy batches.
3. **Every multi-step server process is client-driven, resumable and idempotent** (no background workers): Instagram import jobs with leases and per-batch persistence; cron tasks with a 25 s budget and `more` flag.
4. **One mock, one real API client** behind the same TypeScript interface (`app/src/services/api.ts`). Mock mode is the clickable prototype; real mode is production.

## Repository

| Path | What |
| --- | --- |
| `shared/` | Types, pricing, page layout (used by preview **and** PDF), export-ZIP schema + mojibake fix |
| `app/` | SPA. `routes/` one folder per screen, `components/ui.tsx` design system, `state/` zustand stores, `services/` API clients + import/PDF pipelines, `workers/` |
| `api/` | Functions v4. `functions/` route groups, `lib/` tables/blobs/auth/email/stripe/instagram, bundled by esbuild to `dist/index.js` |
| `scripts/` | `storage-setup.ts`, `smoke.ts` (API), `e2e.ts` (browser), `make-fixtures.ts`, `cron.ts` |
| `infra/` | Bicep + deploy script |
| `fixtures/` | Generated Instagram export ZIPs for tests |

## Data model (Azure Table Storage)

**Accounts** — `PK = userId`

| RowKey | Row | Notes |
| --- | --- | --- |
| `user` | email, authLevel (anonymous/email/password), passwordHash (scrypt), sessionVersion, status | one partition per user ⇒ delete account = delete partition |
| `library_<id>` | source, status, photoCount, newestMediaAt, expiresAt, reminderSentAt, Instagram token (AES-GCM) | one Instagram + one export library per user at MVP |
| `import_<id>` | cursor, since, counters, leaseUntil, pendingJson | resumable Instagram import |
| `book_<id>` | title, format, showMeta, coverPhotoId, photoIds (chunked JSON), pageCount, version, status | drafts and ordered books |
| `order_<id>` | frozen book snapshot, amountCents, status (created→paid→ready), Stripe PI id, pdfBlob/version, shareToken | price computed server-side |

**Photos** — `PK = libraryId`, `RK = <reverseMs(takenAt)>_<photoId>` (newest first; month ranges are RK ranges). Deterministic ids (`ex_<fnv1a(uri)>`, `ig_<mediaId>`) make re-imports idempotent.

**Lookups** — `PK = kind`: `email` (uniqueness via insert-if-absent), `token` (sha256 of magic/reset tokens), `share`, `stripe_evt` (webhook idempotency), `ig_user`, `rl` (rate-limit buckets).

## Blob layout & SAS policy

| Container | Blobs | SAS |
| --- | --- | --- |
| `lib-<libraryId>` | `orig/<photoId>.jpg`, `thumb/<photoId>.jpg` | upload: per-blob `cw`, 1 h (server names the blob) · read: container `r`, day-aligned 2-day window (cacheable) |
| `pdfs` | `<orderId>/v<n>.pdf` | write: per-blob `cw` 1 h, only for paid orders · read: per-blob `r` 15 min with `Content-Disposition` |

Blob CORS allows the app origins for `GET, HEAD, PUT, OPTIONS`. Lifecycle: `pdfs/` → Cool after 90 days, never deleted.

## Auth

- Anonymous session cookie `pg_session` (jose HS256 JWT, 30 days, HttpOnly, Secure, SameSite=Lax). Each request point-reads the user row and rejects if `sessionVersion` differs.
- Passwords: Node `crypto.scrypt` (N=2¹⁷, r=8, p=1) — no native modules.
- CSRF: SameSite=Lax + JSON-only mutations + Origin/Sec-Fetch-Site check (webhooks/callbacks exempt).
- Register upgrades the current user in place; login with `mergeFrom` re-parents an anonymous session's rows.
- Magic links: 32 random bytes, hash stored, 30 days, consumed by an explicit click (mail scanners don't burn them), reusable for 15 minutes.

## Payment gating

`created` → (Stripe webhook / sync / mock-pay) → `paid` → (client uploads PDF, `complete` verifies blob) → `ready`.
The write SAS for the PDF is only minted for `paid`/`ready` orders; the price and the page count come from the server-side book row, never the client.

## Instagram import (bounded batches)

`POST /libraries/{id}/imports` creates a job; the client calls `POST /imports/{job}/run` until `more=false`. Each run takes a 50 s lease, works for 22 s (page `/me/media`, copy `media_url` → Blob, thumbnail with jimp, upsert Photo rows, 4 in parallel), persists cursor + pending items after every batch, and releases the lease. A killed request loses at most one batch; reruns are idempotent.

## Scheduled work

GitHub Actions `cron.yml` (daily) calls `POST /api/cron/run` with `x-cron-key` for each task until `more=false`: `expireLibraries`, `sendReminders`, `refreshIgTokens`, `cleanupOrphans`, `cleanupAnonymous`, `cleanupTokens`.

## Cost (see plan for assumptions)

| Usage | Azure/month |
| --- | --- |
| Testers only | ≈ €0 |
| 50 orders | ≈ €2.5 (blob transactions dominate) |
| 500 orders | ≈ €26 (+ optional SWA Standard €9, Resend Pro €18) |

## Known limitations

- Meta App Review is required before the Instagram connect path works for the public (`FEATURE_CONNECT_ENABLED`).
- Managed Functions cold start 2–5 s; the daily cron warms the app.
- Table Storage has no secondary indexes; cron does small full scans (fine for MVP; index later via Lookups).
- A determined user could build a similar PDF from their own photos without paying; no DRM by design.
