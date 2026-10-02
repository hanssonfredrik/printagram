# Inbunden Admin

A separate web app for running Inbunden: dashboard, users (list, edit, delete, admin access), orders, VAT report, visitor statistics, promo codes, audit log and settings.

| | |
| --- | --- |
| Code | `admin/app` (React + Vite SPA), `admin/api` (managed Functions, Node 20) |
| Azure | Static Web App `printagram-admin-prod` (Free) in `printagram-rg`, sharing the main storage account (`infra/admin.bicep`) |
| Deploy | `.github/workflows/deploy-admin.yml`: on push to `main` touching `admin/**`, `api/src/lib/**` or `shared/**`, or by hand |
| Local | `./start-local.ps1 -Admin` → http://localhost:5180 (API on :7072) |

## Security model

Who gets in: a user row with `isAdmin = true`, signed in with their Inbunden email and password **and** a TOTP code from an authenticator app. There is no IP allow-list; MFA replaces it.

1. **Separate site, separate secrets.** The admin runs on its own hostname, so the customer cookie `pg_session` never reaches it, and the admin cookie never reaches inbunden.com. Sessions are signed with `ADMIN_JWT_SECRET`, never the customer `AUTH_JWT_SECRET`. The app refuses to start in Azure if `ADMIN_JWT_SECRET` or `ADMIN_TOTP_ENC_KEY` is missing or shorter than 32 characters, or if `ADMIN_JWT_SECRET` equals `AUTH_JWT_SECRET` (`admin/api/src/config.ts`).
2. **Sign-in in two steps** (`admin/api/src/functions/auth.ts`):
   - `POST auth/login` checks email + password. A wrong password, an unknown email and a non-admin account all get the same 401, and an unknown email still pays the scrypt cost. Success returns a 5-minute challenge, not a session.
   - `POST auth/totp` (or `auth/enroll` on the first sign-in) checks the 6-digit RFC 6238 code (±30 s). A code at or below the last accepted time step is refused, so codes cannot be replayed.
   - Rate limits: 10 sign-ins per IP and 5 per email per 15 minutes; 5 code attempts per user per 15 minutes.
3. **Session cookie** `__Host-inb_admin`: HttpOnly, Secure, SameSite=Strict, host-only, 8 hours. **Every request re-reads the user row** and requires `status = active`, `isAdmin = true`, an enrolled authenticator, and matching `sessionVersion` + `adminSessionVersion`. So removing admin access, a password reset on inbunden.com, or "Sign out everywhere" ends sessions on the very next request.
4. **Every route goes through `adminRoute()`** (`admin/api/src/lib/route.ts`), which fails closed:
   - Every request must carry `X-Requested-With: inbunden-admin`, and `Sec-Fetch-Site`/`Origin` must be same-origin when present. Cross-site forms and scripts cannot send that header without a CORS preflight, which the API never answers.
   - Routes need a session unless they are in `PUBLIC_ROUTES` (exactly the three sign-in steps; a test asserts the list).
   - Every change, and reads that hand out customer content (PDF links), writes a row to the `AdminAudit` table.
5. **TOTP secrets** are stored AES-256-GCM-encrypted with `ADMIN_TOTP_ENC_KEY`.
6. **What the UI can see** is listed field by field in `admin/api/src/lib/views.ts`. It never includes password hashes, TOTP secrets, access tokens, share tokens or blob paths.
7. **Headers** (`admin/app/public/staticwebapp.config.json`): strict CSP (`default-src 'self'`, no inline script or style, no third-party origins), `frame-ancestors 'none'`, HSTS, `noindex`, and `/.auth/*` disabled.
8. **Guard rails:** you cannot remove your own admin access, reset your own authenticator, or delete your own account from the admin. Deleting a user requires typing their email. Deleting an order requires typing the order id, and a paid Stripe order also needs the "Stripe test-mode payment" box ticked, because real paid orders must be kept for the accounts (7 years).

### `isAdmin` on the user row

`UserRow` has optional admin fields: `isAdmin`, `adminSessionVersion`, `adminTotpSecret` and `adminTotpLastStep`. New users get `isAdmin: false`. The main API never reads or writes these fields, and a test checks that register and password changes keep them and that `/api/me` never exposes them. Only the admin app (Users → Make admin / Remove admin access) and `scripts/admin.ts` change them.

### Known trade-offs

- **The first sign-in enrolls the authenticator with only the password.** Grant access right before you sign in, and sign in at once. Until then, someone who has the password could enroll their own authenticator.
- **The page itself is public** (SWA Free cannot restrict it). It contains no data or secrets; everything sits behind the API.
- **Resetting a password on inbunden.com signs you out of the admin.** It still needs the TOTP code to get back in, so a stolen email inbox alone is not enough.

## First-time setup

The user runs these steps (they change Azure):

1. `./infra/deploy-admin.ps1 -ResourceGroup printagram-rg -Env prod`. This creates the admin SWA, its settings and the `Visits`/`AdminAudit` tables. It does not touch the main site's app settings.
2. Add the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_ADMIN` (the script prints it).
3. Push to `main` or run *Actions → Deploy admin*.
4. Make sure your own email has an Inbunden account with a password, then:
   ```powershell
   $env:STORAGE_CONNECTION_STRING = '<storage account → Access keys → connection string>'
   npx tsx scripts/admin.ts grant <your email>
   ```
5. Open the admin URL at once, sign in and scan the QR code (Microsoft Authenticator, Google Authenticator, 1Password…).
6. Optional: custom domain `admin.inbunden.com` (CNAME to the admin SWA hostname; the admin SWA has its own two free domain slots).

## Lost phone / recovery

```powershell
npx tsx scripts/admin.ts reset-totp <your email>   # with the prod connection string
```

Then sign in again to enroll a new authenticator. `scripts/admin.ts list` shows admins, and `revoke <email>` removes access. Another admin can also use *Users → Reset authenticator*.

## Pages and data

| Page | Source | Notes |
| --- | --- | --- |
| Dashboard | `GET stats/overview` | Revenue (Stripe vs test payments), paid orders, visitors, accounts, active accounts (lastSeenAt), paying customers, libraries/photos, per-day charts |
| Users | `GET/PATCH/DELETE users…` | Search and filter; edit email, language and admin access; sign the user out everywhere; delete (same code as `DELETE /api/account`: `api/src/lib/accountService.ts`) |
| Orders | `GET/DELETE orders…` | Filter by status, provider and date; detail with Stripe links and a 10-minute PDF link (audited); delete a test order (`deleteOrder` in `api/src/lib/accountService.ts`: PDFs, share link and promo use go, the book becomes a draft again) |
| VAT report | `GET reports/vat` | Month/quarter/year, Stripe or test payments. VAT = gross × r / (100 + r), per order; refunded orders shown apart; CSV export |
| Visitors | `GET stats/visits` | From the cookieless beacon (below) |
| Promo codes | `GET/POST/PATCH promos` | The same rows `scripts/promo.ts` manages |
| Audit log | `GET audit?month=` | Sign-in attempts and every change |
| Settings | `GET/PUT settings` | VAT rate (default 25 %), sign out all admin sessions |

All lists are full table scans (no secondary indexes in Table Storage). That is fine at current volumes; add Lookups-based indexes when it gets slow.

**VAT caveats:**
- The 6 % vs 25 % question for the PDF is open (`docs/crimson-print-on-demand.md`); confirm it with an accountant.
- Customer country is not stored, so OSS (EU sales above €10 000/year) cannot be split out yet.
- Refund dates are not stored either; refunds appear in the period of the original payment.

## Visitor statistics (main site)

`app/src/services/visits.ts` sends `POST /api/v` on each route change (`navigator.sendBeacon`): the path, the referrer (first page only) and the UI language. `api/src/functions/visits.ts` stores one `Visits` row per view (PK = day):

- No cookie, no localStorage, no IP.
- `visitor` = sha256(daily salt + IP + user agent), first 16 characters. The salt is random per day (Lookups `visit_salt`) and deleted afterwards by `cleanupTokens`. A visitor is therefore counted once per day and cannot be followed across days.
- Tokens in `/s/…`, `/r/…`, `/reset/…` and `/done/…` are replaced with placeholders before storing.
- Bots and automated browsers (prerender, e2e) are skipped. Do Not Track and Global Privacy Control are not: nothing here identifies a person, and both still block Google Analytics.
- Rows older than 90 days are deleted by the cron task `cleanupVisits`.

The privacy policy (`app/src/i18n/*/legal.ts`) describes this.

## Adding an endpoint

1. Register it with `adminRoute(name, { methods, route }, handler)` in `admin/api/src/functions/`, and import the file in `admin/api/src/index.ts`. It requires a session by default; never add to `PUBLIC_ROUTES`.
2. Shape the output through `admin/api/src/lib/views.ts` (explicit fields only).
3. Mutations are audited automatically; call `note(detail, target)` to make the row useful. Pass `auditRead: true` for reads that expose customer content.
4. Shared data access goes through `admin/api/src/core.ts`, which re-exports `api/src/lib`. Do not import the customer session helpers.
