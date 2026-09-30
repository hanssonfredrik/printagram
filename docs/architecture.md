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
│     ├─ Instagram Graph API (OAuth, /me/media, media copy)
│     └─ Google Photos Picker API (OAuth, sessions, media copy)
│
GitHub Actions: deploy on push · daily cron → POST /api/cron/run
```

## Principles

1. **Two Azure resources only** (Storage account + SWA Free). No queues, timers, identities or Key Vault.
2. **Heavy bytes never touch Functions.** ZIP parsing, thumbnails, PDF rendering happen in the browser; photos and PDFs move browser ↔ Blob with short-lived SAS URLs. Functions do JSON, SAS minting, Stripe and bounded Instagram copy batches.
3. **Every multi-step server process is client-driven, resumable and idempotent** (no background workers): Instagram import jobs with leases and per-batch persistence; cron tasks with a 25 s budget and `more` flag.
4. **One API client, one test double.** The app always talks to the real API (locally: Functions on Azurite). An in-memory implementation of the same interface exists only for component tests (`app/src/test/fakeApi.ts`).
5. **The preview is the print.** Preview and PDF draw from the same millimetre geometry in `shared/layout.ts`.

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
| `book_<id>` | title, format, showMeta, coverPhotoId, layout `{density, fullBleed}`, pages (chunked JSON `PageSpec[]`), manualLayout, photoIds (derived), pageCount, version, status | drafts and ordered books; `version` only changes when the content hash does |
| `order_<id>` | frozen book snapshot incl. pages, contentHash, subtotal/discount/amount, promoCode, paymentProvider, status (created→paid→ready, retryable `failed`), failureReason, pdfBlob/version, shareToken | price computed server-side |

**Photos** — `PK = libraryId`, `RK = <reverseMs(takenAt)>_<photoId>` (newest first; month ranges are RK ranges). Deterministic ids (`ex_<64-bit fnv1a(uri)>`, `ig_<mediaId>`) make re-imports idempotent. Rows keep width, height and the sniffed mime type.

**Lookups** — `PK = kind`: `email` (uniqueness via insert-if-absent), `token` (sha256 of magic/reset tokens), `share`, `stripe_evt` (webhook idempotency), `ig_user`, `rl` (rate-limit buckets), `promo` (discount codes, redemptions counted with ETag concurrency), `promo_use` (`CODE:userId`, once-per-user codes).

## Blob layout & SAS policy

| Container | Blobs | SAS |
| --- | --- | --- |
| `lib-<libraryId>` | `orig/<photoId>.<jpg\|png\|webp>`, `thumb/<photoId>.jpg` | upload: per-blob `cw`, 1 h (server names the blob) · read: container `r`, day-aligned 2-day window (cacheable) |
| `pdfs` | `<orderId>/v<n>.pdf` | write: per-blob `cw` 1 h, only for paid orders · read: per-blob `r` 15 min with `Content-Disposition` |

Blob CORS allows the app origins for `GET, HEAD, PUT, OPTIONS`. Lifecycle: `pdfs/` → Cool after 90 days, never deleted.

## Auth

- Anonymous session cookie `pg_session` (jose HS256 JWT, 30 days, HttpOnly, Secure, SameSite=Lax). Each request point-reads the user row and rejects if `sessionVersion` differs.
- Passwords: Node `crypto.scrypt` (N=2¹⁷, r=8, p=1) — no native modules.
- CSRF: SameSite=Lax + JSON-only mutations + Origin/Sec-Fetch-Site check (webhooks/callbacks exempt).
- Register upgrades the current user in place; login with `mergeFrom` re-parents an anonymous session's rows.
- Magic links: 32 random bytes, hash stored, 30 days, consumed by an explicit click (mail scanners don't burn them), reusable for 15 minutes.

## Payment gating

`created` ⇄ `failed` → (provider confirms) → `paid` → (client uploads PDF, `complete` checks size and the `%PDF-` header) → `ready`.
The write SAS for the PDF is only minted for `paid`/`ready` orders; the price and the page count come from the server-side book row, never the client. Creating an order for unchanged book content reuses the open order.

### Payment providers

`api/src/lib/payments/` defines one interface (`prepare`, `status`) with two implementations, chosen only by `PAYMENT_PROVIDER` (default `fake`):

- **fake**: no external calls. `POST /orders/{id}/pay-test {card}` (password-level account required; 404 for other providers) maps the published test cards to success, a decline or insufficient funds. The UI shows read-only test cards, never card fields.
- **stripe**: PaymentIntent per order, webhook (signature + event-id idempotency) plus `/orders/{id}/sync` as a fallback.

Discount codes reprice the open order (`POST /orders/{id}/promo`). A 0-total order is confirmed with `confirm-free`, and the redemption is recorded when the order is paid.

## Page layout

`shared/layout.ts` defines pages in millimetres: square 210×210 and portrait 210×280, 12 mm margins, 5 mm gutters, an 8 mm caption band and 10 mm safe area.

- Templates: `1-margin`, `1-bleed`, `2-stack`, `2-side`, `3-hero`, `4-grid`, `text`. Each is a list of slots with `contain`/`cover` fit and a bleed flag.
- `autoLayout(photos, {density, fullBleed})` groups photos by aspect ratio and time (new page after a 24 h gap). `reconcilePages` keeps hand-arranged pages valid when the selection changes.
- `placePhoto` resolves a slot to an image rect, crop and caption rect. `effectivePpi` flags photos below 150 ppi (soft) or 100 ppi (low); nothing is upscaled.
- The book is cover, title page, content pages and back cover (`buildPages`, `totalPages`).

## PDF output

Built in the browser (`app/src/workers/pdfBook.ts`, run by `pdf.worker.ts`):

- MediaBox = BleedBox = trim + `PRINT_BLEED_MM` (default 4) on each side; TrimBox marks the cut. Full-bleed slots extend into the bleed.
- sRGB IEC61966-2.1 OutputIntent (CC0 profile) and XMP metadata. RGB throughout; print providers convert. Not declared PDF/X.
- JPEG originals are embedded byte-for-byte, with EXIF orientation applied as a transform. WebP is re-encoded as JPEG (q 0.92).
- Text: Lora (titles, text pages) and Albert Sans (captions), falling back per glyph to Noto Sans and monochrome Noto Emoji. Fonts are embedded whole, because pdf-lib's subsetter drops composite glyphs; fallback fonts are embedded only when used.
- If any photo cannot be loaded the PDF is not delivered. Uploads larger than 4 MB go in blocks (Put Block / Put Block List) with retries.

## Languages

English and Swedish (`Lang` in `shared/src/i18n.ts`).

- UI: typed dictionaries in `app/src/i18n/{en,sv}/`; English is the source and `tsc` fails if a Swedish key is missing. The language is the visitor's choice (`printagram.lang` in localStorage), else the browser language, else English.
- API: the app sends `X-Lang` on every request. `route()` puts it on the context (falling back to `Accept-Language`) and stores it on the user row (`lang`) when it changes, so emails sent later from cron use it. Error messages stay English; the app translates them by `code`.
- Book: `lang` on the book and on the order snapshot decides the printed text (title-page subtitle, caption dates, back cover, default title, "(copy)"). It enters the content hash only when it is not English, so books from before languages keep their hash.

## Instagram import (bounded batches)

`POST /libraries/{id}/imports` creates a job; the client calls `POST /imports/{job}/run` until `more=false`. Each run takes a 50 s lease, works for 22 s (page `/me/media`, copy `media_url` → Blob, thumbnail with jimp, upsert Photo rows, 4 in parallel), persists cursor + pending items after every batch, and releases the lease. A killed request loses at most one batch; reruns are idempotent.

## Google Photos import (same job loop)

Private Instagram accounts have no API, so the user lets Instagram transfer their posts to Google Photos and picks them there. `GET /google/start` → Google consent (Picker scope, 1-hour token, encrypted on the library row) → `POST /google/session` opens a Picker session (`pickerUri` for the user, polled via `GET /google/session`) → the same `POST /libraries/{id}/imports` + `POST /imports/{job}/run` loop as above, branching on `library.source`. Bytes go through Functions here on purpose: Picker base URLs require the bearer token, and Google does not promise CORS on them. Each item becomes `gp_<mediaId>`; captions are empty, likes null, and `takenAt` is the EXIF date when the JPEG has one, else Google's `createTime`.

## Scheduled work

GitHub Actions `cron.yml` (daily) calls `POST /api/cron/run` with `x-cron-key` for each task until `more=false`: `expireLibraries`, `sendReminders`, `refreshIgTokens`, `cleanupOrphans`, `cleanupAnonymous`, `cleanupTokens`.

## Cost (see plan for assumptions)

| Usage | Azure/month |
| --- | --- |
| Testers only | ≈ €0 |
| 50 orders | ≈ €2.5 (blob transactions dominate) |
| 500 orders | ≈ €26 (+ optional SWA Standard €9, Resend Pro €18) |

## Known limitations

- Meta App Review is required before the Instagram connect path works for the public (`FEATURE_CONNECT_ENABLED`); a verified Google OAuth client before the Google Photos card shows (`FEATURE_GOOGLE_PHOTOS_ENABLED`).
- Google Photos brings pictures only: no captions or likes, and dates may be the transfer date. Captions for private accounts need Meta's transfer-destination programme (see `docs/GO_LIVE.md` §7).
- Managed Functions cold start 2–5 s; the daily cron warms the app.
- Table Storage has no secondary indexes; cron does small full scans (fine for MVP; index later via Lookups).
- A determined user could build a similar PDF from their own photos without paying; no DRM by design.
