# Printagram — User stories

Status legend

| Status | Meaning |
| --- | --- |
| ✅ UI | Implemented in the clickable app (mock mode and real mode) |
| ✅ API | Implemented in the managed Functions backend and covered by `scripts/smoke.ts` / `scripts/e2e.ts` |
| 🟡 Partial | Built but blocked on an external prerequisite (noted) |
| ⬜ Future | Specified, not built |

Personas: **Mara** (personal Instagram account, wants a book of a year), **Jonas** (Creator account, wants his most-liked posts printed), **Ops** (the person running Printagram).

---

## Epic 1 — Marketing & landing

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 1.1 | As a visitor I want to understand what Printagram does in 10 seconds so I decide whether to start. | Hero headline, sub-line, primary CTA "Start your book", "PDF from €9". | ✅ UI |
| 1.2 | As a visitor I want to see how it works in three steps. | Bring in / Pick / Print cards. | ✅ UI |
| 1.3 | As a visitor I want to see sample spreads so I trust the layout quality. | Three sample spreads (trip, first year, year in review). | ✅ UI |
| 1.4 | As a visitor I want transparent pricing. | €9 PDF incl. 40 pages, €0,15 per extra page (from `/api/config`), softcover from €29 and hardcover from €49 marked "Coming soon". | ✅ UI ✅ API |
| 1.5 | As a visitor I want answers to safety, account-type, private-account, export-time, retention, deliverable and layout questions. | FAQ block with the seven questions from the design. | ✅ UI |
| 1.6 | As a returning customer I want "Sign in" / "My books" in the header. | Header switches based on session. | ✅ UI |

## Epic 2 — Bring in photos: choose a source

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 2.1 | As Mara I want to pick between connecting Instagram and uploading an export, with the trade-offs explained. | Two cards with pros/warnings; "Not sure which account you have?" hint. | ✅ UI |
| 2.2 | As Ops I want to switch the Connect card to "Coming soon" until Meta approves the app. | `FEATURE_CONNECT_ENABLED` app setting → `/api/config.connectEnabled`; card shows waiting-for-approval note and hides the button. | ✅ UI ✅ API |
| 2.3 | As a returning user adding photos I want to be told only newer posts are imported. | "Adding to your library" banner with current count; back goes to My books. | ✅ UI |

## Epic 3 — Import via Instagram connect

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 3.1 | As Jonas I want to say what kind of account I have and see what will be requested. | Segmented Creator/Business · Personal · Not sure; permission list; "Continue with Instagram". | ✅ UI |
| 3.2 | As Mara (personal) I want step-by-step instructions to switch to a Professional account, with the privacy warning. | Five steps, "Good to know" box, "I've switched" and "use the export" actions. | ✅ UI |
| 3.3 | As a user I want a quick way to check my account type. | "Not sure" path with the Professional dashboard hint and two buttons. | ✅ UI |
| 3.4 | As a user I want to log in on instagram.com and come back automatically. | OAuth start (`/api/instagram/start`, signed state) → Instagram → `/api/instagram/callback` → short → long-lived token (60 d) → back to `/connect?connected=1`. | 🟡 Partial — code complete; needs a Meta app + App Review (Advanced Access for `instagram_business_basic`) |
| 3.5 | As a user whose account is personal or who cancelled I want a clear error and next steps. | Error card with "Show me how to switch", "Try again", "Use the export instead". | ✅ UI |
| 3.6 | As a user I want to see my posts being copied with progress. | Client loops `POST /api/imports/{job}/run` (22 s batches, lease, resumable); progress bar and explanation. | ✅ UI ✅ API |
| 3.7 | As a user I want a summary of what was found and to continue to selection. | "Found N photos from YYYY–YYYY", posts/carousels/videos, sample grid, CTA. | ✅ UI |
| 3.8 | As a user I want to disconnect Instagram at any time. | "Disconnect now" → token removed; copied photos stay. | ✅ UI ✅ API |
| 3.9 | As Ops I must honour Meta's deauthorize and data-deletion callbacks. | `POST /api/instagram/deauthorize`, `POST /api/instagram/data-deletion` (signed_request verified). | ✅ API |
| 3.10 | As Ops I want long-lived tokens refreshed before they expire. | Cron `refreshIgTokens` refreshes tokens with < 30 days left; invalid tokens flag "reconnect". | ✅ API |
| 3.11 | As Jonas I want captions from Instagram on my pages. | Depends on Instagram Login exposing `caption` (docs say Facebook Login only); UI hides empty captions. | 🟡 Partial — verify with a tester account |

## Epic 4 — Import via Instagram export (ZIP)

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 4.1 | As Mara I want phone and computer instructions for requesting the export with the right options. | Two tabs, six steps each, "What happens next" box. | ✅ UI |
| 4.2 | As Mara I want the steps emailed to me. | "Email me these steps" → `POST /api/auth/export-steps`. | ✅ UI ✅ API |
| 4.3 | As Mara I want a return link so I can continue on any device when the ZIP arrives. | Waiting screen email form → `POST /api/auth/return-link` → magic link `/r/:token` (30 days, consumed on click, reusable 15 min). | ✅ UI ✅ API |
| 4.4 | As Mara I want to drop the ZIP and have it read without uploading the whole archive. | zip.js in a Web Worker reads `posts_*.json` and only the referenced images; originals + 400 px thumbnails go straight to Blob Storage via per-blob SAS. Verified with a real ZIP in `scripts/e2e.ts`. | ✅ UI ✅ API |
| 4.5 | As Mara I want clear errors for HTML exports, exports without posts, corrupt files and files over 8 GB. | Four error banners with "Show the export steps again" where relevant. | ✅ UI |
| 4.6 | As Mara I want captions with åäö and emoji to appear correctly. | Mojibake (UTF-8 as Latin-1, incl. cp1252 variants) reversed; unit-tested. | ✅ UI |
| 4.7 | As Mara I want carousels and videos handled sensibly. | Carousel index/count kept; videos counted and skipped by default. | ✅ UI ✅ API |
| 4.8 | As a returning user I want "Add more photos" to import only posts newer than my last import. | `register` with `incremental=true` skips posts older than `newestMediaAt` and already-ready photos. | ✅ UI ✅ API |
| 4.9 | As Mara I want the import to survive a flaky connection. | Deterministic photo ids; re-running an import upserts and reports skipped items. | ✅ API |

## Epic 5 — Photo library & retention

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 5.1 | As a user I want my photos kept for 3 months so I can make more books without re-importing. | `expiresAt = now + 90 d` on import; shown as "Kept until". | ✅ UI ✅ API |
| 5.2 | As a user I want every order to extend retention by 3 months. | `markPaid` sets `expiresAt = max(now, current) + 90 d`. | ✅ API |
| 5.3 | As a user I want a reminder email 7 days before deletion with keep/delete actions. | Cron `sendReminders`; email template mirrors the design; `/email-preview` dev screen. | ✅ UI ✅ API |
| 5.4 | As a user I want to delete my photos immediately, with a confirmation that explains consequences. | Confirm box "Delete N photos and drafts?"; ordered PDFs stay. | ✅ UI ✅ API |
| 5.5 | As Ops I want expired libraries removed automatically and the user informed. | Cron `expireLibraries` deletes container + rows, keeps the library row as `expired`, sends "deleted" email. | ✅ API |
| 5.6 | As Ops I want orphaned blobs, stale pending photos and abandoned anonymous sessions cleaned up. | Cron `cleanupOrphans`, `cleanupAnonymous` (30 days, no orders), `cleanupTokens`. | ✅ API |

## Epic 6 — Selecting photos

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 6.1 | As a user I want my photos grouped by year and month, newest first. | Year headers with counts, month sections, square tiles. | ✅ UI |
| 6.2 | As a user I want "All photos" or "Choose photos" modes with select/deselect per year and month. | Segmented control; per-group toggle links; per-tile checkmarks. | ✅ UI |
| 6.3 | As a user I want filters: photos only, most liked (connect source), carousels first/all, month range. | Chips + two month selects; range auto-corrects. | ✅ UI |
| 6.4 | As a user I want to see the running page count and price. | Footer "N photos selected · ~P pages · €X"; Continue disabled at 0 or above the 600-photo cap. | ✅ UI |
| 6.5 | As a user with no posts I want a helpful empty state. | "No photos found" with guidance and back button. | ✅ UI |
| 6.6 | As a user I want my selection to survive a refresh or a return link. | Draft persisted in localStorage per library. | ✅ UI |

## Epic 7 — Book design & preview

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 7.1 | As a user I want to page through my book before paying. | Cover, title page, photo pages, back cover; prev/next; "Page N of M". | ✅ UI |
| 7.2 | As a user I want to set title, format (Square 21×21 / Portrait 21×28), cover photo and captions toggle. | All four controls; preview updates instantly. | ✅ UI |
| 7.3 | As a user I want the preview to match the PDF exactly. | Both use `shared/layout.ts` (same page list and slot geometry). | ✅ UI |
| 7.4 | As a user I want my draft saved so it appears in My books. | Draft upserted on Checkout (`POST/PATCH /api/books`). | ✅ UI ✅ API |
| 7.5 | As a user I want more layout choices (1–4 photos per page, full-bleed, text pages). | — | ⬜ Future |
| 7.6 | As a user I want to reorder photos or pages by drag and drop. | — | ⬜ Future |

## Epic 8 — Checkout & payment

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 8.1 | As a user I want to see the format options with softcover/hardcover marked coming soon. | Three option rows. | ✅ UI |
| 8.2 | As a user I want to pay with Apple Pay, Google Pay or card. | Stripe Payment Element + Express Checkout Element; PaymentIntent created server-side with server-computed price. | ✅ UI ✅ API (test mode needs keys; mock form when unset) |
| 8.3 | As a user I want an account created during checkout without a separate signup. | Email + password fields; registered before payment confirmation; "Sign in" link for existing accounts. | ✅ UI ✅ API |
| 8.4 | As a user I want a clear order summary. | Cover thumb, pages/format/photos, base price, extra pages line, total. | ✅ UI |
| 8.5 | As a user I want declined payments explained and retryable. | Error banner; state resets on edit. | ✅ UI ✅ API |
| 8.6 | As Ops I want payment confirmation to be authoritative. | Stripe webhook (signature + event-id idempotency) marks paid; `/orders/{id}/sync` fallback polls Stripe. | ✅ API |
| 8.7 | As Ops I never want a PDF issued for an unpaid order. | Write SAS for `pdfs/` only for `paid`/`ready` orders; `complete` verifies the blob. | ✅ API |
| 8.8 | As a user I want a receipt email. | Stripe `receipt_email`. | ✅ API (Stripe-side) |
| 8.9 | As a user I want discount codes / gift cards. | — | ⬜ Future |

## Epic 9 — PDF generation & delivery

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 9.1 | As a user I want my PDF built right after payment with progress. | Web Worker + pdf-lib: fonts, images, pages, saving stages; uploaded via SAS; `complete` → `ready`. Verified: 6-page PDF, 21×21 cm, images on every photo page. | ✅ UI ✅ API |
| 9.2 | As a user I want to download the PDF now and later. | Download button; later via My books → 15-min read SAS with filename. | ✅ UI ✅ API |
| 9.3 | As a user I want to share a link to the PDF. | Share token → `/s/:token` public page. | ✅ UI ✅ API |
| 9.4 | As a user I want to be able to rebuild the PDF if my tab closed mid-way. | "Finish PDF" from My books; regenerate path issues a new version. | ✅ UI ✅ API |
| 9.5 | As a user I want an email when the book is ready. | `order-ready` template. | ✅ API |
| 9.6 | As a user I want print-shop-grade output (PDF/X-4, 4 mm bleed, ICC profile, 300 dpi upscaling). | Bleed parameter reserved in `shared/layout.ts`. | ⬜ Future |

## Epic 10 — Accounts & auth

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 10.1 | As a visitor I want to start without an account and keep my work when I create one. | Anonymous session cookie; register upgrades the same user; login with `mergeFrom` re-parents anonymous data. | ✅ UI ✅ API |
| 10.2 | As a user I want to sign in with email and password. | `/signin`; scrypt hashes; rate limits per IP/email. | ✅ UI ✅ API |
| 10.3 | As a user I want to reset a forgotten password. | `/auth/forgot` (always 202) → email → `/reset/:token` (1 h). | ✅ UI ✅ API |
| 10.4 | As a user I want to sign out everywhere when I change my password. | `sessionVersion` bump invalidates old cookies. | ✅ API |
| 10.5 | As a user I want to delete my account and all data. | `DELETE /api/account` removes photos, PDFs, drafts, orders, lookups. | ✅ API (no UI yet) |
| 10.6 | As a user I want to sign in with Google/Apple. | — | ⬜ Future |

## Epic 11 — My books

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 11.1 | As a user I want to see my library (count, source, imported date, kept-until) with New book / Add more photos / Delete actions. | Library card, empty state when deleted/expired. | ✅ UI |
| 11.2 | As a user I want my drafts and ordered books listed with the right actions. | Draft → Continue; Ordered → Download PDF (or Finish PDF), Duplicate. | ✅ UI ✅ API |
| 11.3 | As a user I want to duplicate an ordered book to tweak it. | `POST /api/books/{id}/duplicate` → preview. | ✅ UI ✅ API |
| 11.4 | As a user I want to rename or delete drafts from the list. | — | ⬜ Future |

## Epic 12 — Emails

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 12.1 | Return link, export steps, password reset, order ready, library reminder, library deleted. | Templates in `api/src/emails` (HTML + text); Resend driver, console driver for dev. | ✅ API |
| 12.2 | As Ops I want a verified sending domain (SPF/DKIM/DMARC). | Runbook step. | ⬜ Ops task |

## Epic 13 — Ops, deployment & cost

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 13.1 | As Ops I want one-command provisioning. | `infra/main.bicep` + `infra/deploy.ps1` (Storage + SWA Free). | ✅ |
| 13.2 | As Ops I want CI to lint, test, build and deploy on push. | `.github/workflows/deploy.yml` with PR preview environments. | ✅ |
| 13.3 | As Ops I want scheduled maintenance without paying for timers. | `.github/workflows/cron.yml` → `/api/cron/run` with secret; six tasks. | ✅ |
| 13.4 | As Ops I want a local full-stack environment. | Azurite + `func start` + `swa start`; `scripts/storage-setup.ts`, `scripts/smoke.ts`, `scripts/e2e.ts`. | ✅ |
| 13.5 | As Ops I want monitoring. | Application Insights can be attached to the SWA; not provisioned to stay at €0. | ⬜ Future |
| 13.6 | As Ops I want to know when to move to SWA Standard / Cosmos. | `infra/README.md` scale-up path. | ✅ |

## Epic 14 — Printed books (future)

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 14.1 | As a user I want to order a softcover or hardcover book shipped to me. | Print provider integration (Gelato API: PDF/X-4, 4 mm bleed, 150–300 dpi; or Peecho photobook API which adds bleed); shipping address; provider order webhook → status emails. | ⬜ Future |
| 14.2 | As a user I want a cover designer (spine text, back-cover photo). | — | ⬜ Future |
| 14.3 | As Ops I want print pricing per format/page count and country. | — | ⬜ Future |

## Epic 15 — Legal, privacy & compliance

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 15.1 | Privacy policy and terms pages (required by Meta App Review and Stripe). | Routes `/privacy`, `/terms`. | ⬜ Future |
| 15.2 | Cookie notice (only a strictly necessary session cookie; no analytics). | Banner not required for essential cookies; document in privacy policy. | ⬜ Future |
| 15.3 | Data deletion confirmation page for Meta (`/privacy/deletion?code=`). | — | ⬜ Future |
| 15.4 | Instagram tokens encrypted at rest; no passwords stored in plain text; account deletion. | AES-256-GCM, scrypt, `DELETE /api/account`. | ✅ API |

## Epic 16 — Accessibility & i18n

| ID | Story | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 16.1 | Keyboard and screen-reader support for all controls. | Buttons/roles/labels on tiles, tabs, switch; focus outlines. | ✅ UI (baseline) |
| 16.2 | Phone-first layout without horizontal scroll. | Verified at 390 px in e2e. | ✅ UI |
| 16.3 | Swedish and other languages. | — | ⬜ Future |
