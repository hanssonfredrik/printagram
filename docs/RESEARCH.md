# Research notes (September 2026)

Sources were checked on 18 Sep 2026. Pricing changes; re-verify before relying on a number.

## Azure Static Web Apps — Free vs Standard

| | Free | Standard |
| --- | --- | --- |
| Price | €0 | ≈ $9/month |
| Bandwidth | 100 GB/month (no overage — throttled) | 100 GB + $0.20/GB |
| App size | 250 MB per environment (500 MB total) | 500 MB / 2 GB |
| Custom domains | 2, free SSL | 5–6 |
| APIs | **Managed Functions only**: HTTP triggers, Consumption, Node 20/22 (`apiRuntime`), 45 s proxy timeout, 30 MB request limit, no managed identity, no Key Vault references, no Durable | Managed or bring-your-own Functions app |
| Auth | Pre-configured GitHub + Microsoft Entra only | Custom providers |
| SLA | none | yes |
| Apps per subscription | 10 | 100 |

Consequences: own auth in Functions; big transfers browser ↔ Blob; scheduled work via GitHub Actions; keep the SPA + JSON under 100 GB (photos/PDFs are served from Blob, which has its own 100 GB free egress).

Sources: [plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans), [quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas), [apis-functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions), [languages-runtimes](https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes), [authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization), [45 s timeout](https://learn.microsoft.com/en-us/answers/questions/1359900/swa-azure-function-backend-returns-500-after-45-se).

## Storage / database options

| Option | Free tier | Notes |
| --- | --- | --- |
| Azure Table Storage | none, but ≈ $0.045/GB + $0.00036 per 10k transactions → cents | same account as blobs, Azurite emulates it, no secondary indexes — **chosen** |
| Cosmos DB free tier | 1000 RU/s + 25 GB for the account's lifetime, one per subscription | richer queries; heavier SDK; Table API is a drop-in migration path |
| Azure SQL free offer | 100k vCore-seconds/month, auto-pauses | resume latency (30–60 s) collides with the 45 s Function timeout |
| Blob Storage hot LRS | ≈ $0.018/GB/month; first 100 GB/month internet egress free | photos + PDFs |

Sources: [Cosmos free tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier), [SQL free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer), [Table pricing](https://azure.microsoft.com/en-us/pricing/details/storage/tables/), [Blob pricing overview](https://www.cloudzero.com/blog/azure-blob-storage-pricing/).

## Compute alternatives (not needed yet)

Azure Functions Flex Consumption: 250k executions + 100k GB-s free per month per subscription, then $0.40/M executions. Would allow timers/queues if managed Functions become limiting (requires SWA Standard to link, or a separate app with CORS). [Pricing](https://azure.microsoft.com/en-us/pricing/details/functions/).

## Email

| Provider | Free | Then |
| --- | --- | --- |
| Resend | 3 000/month, 100/day | $20/month for 50k — **chosen** (HTTP API, no SDK needed) |
| Brevo | 300/day | $9+/month |
| Azure Communication Services | none | $0.00025/email + $0.00012/MB |

## Payments

Stripe EU cards 1.5 % + €0.25 (non-EU higher). Payment Element + Express Checkout Element give card + Apple Pay + Google Pay in one integration; wallets require registering the domain under *Payment method domains*. PaymentIntent per order, webhook `payment_intent.succeeded` as the source of truth. [Express Checkout](https://docs.stripe.com/elements/express-checkout-element), [domain registration](https://docs.stripe.com/payments/payment-methods/pmd-registration).

## Instagram

**Instagram API with Instagram Login** (Business Login for Instagram) — the only official way to read a user's own media since the Basic Display API was switched off (Dec 2024). Professional (Creator/Business) accounts only; personal accounts cannot be read by any API.

- Authorize: `https://www.instagram.com/oauth/authorize?client_id&redirect_uri&response_type=code&scope=instagram_business_basic&state`
- Code → short-lived token: `POST https://api.instagram.com/oauth/access_token`
- Long-lived (60 days): `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret&access_token`
- Refresh: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token` (token must be ≥ 24 h old, unexpired)
- Media: `GET https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,timestamp,like_count,children{...}`; `media_url` CDN links expire and are not CORS-readable → copy server-side.
- **Caption**: the media reference marks `caption` as "Instagram API with Facebook Login only" — verify with a tester account; the UI hides empty captions.
- Access: Standard Access works for app testers; Advanced Access (public users) requires App Review with business verification, a live privacy policy, a data-deletion callback and a screencast. Expect weeks → ship behind `FEATURE_CONNECT_ENABLED`.
- Rate limit ≈ 200 calls/hour/user (list pages only; CDN downloads don't count).

Sources: [Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login), [media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media), [2026 overview](https://storrito.com/resources/instagram-api-2026/).

## Instagram export ZIP ("Download your information")

- Request: Accounts Center → Your information and permissions → Export your information → Create export → Export to device → Customize: Posts only → Date range All time, Format **JSON**, Media quality Higher.
- Layout: `your_instagram_activity/media/posts_1.json` (array of posts; `media[]` with `uri`, `creation_timestamp`, `title`), media under `media/posts/YYYYMM/`. Carousels carry post-level `creation_timestamp`/`title`; single-image posts only inside `media[0]`. Older exports used `content/posts_1.json`.
- Text is UTF-8 that was serialised as Latin-1 (mojibake, e.g. `Ã¥` for `å`); reversed in `shared/exportSchema.ts`.
- Download link is valid for four days; Instagram may take hours to days to prepare it; multi-GB archives are normal → parsed in the browser with zip.js (`BlobReader`, Zip64), never uploaded whole.

Sources: [timestamp quirks gist](https://gist.github.com/JoeGermuska/5e0f91b6bee8fb2ee943b141214b9582), [safe-unfollow export doc](https://github.com/ignromanov/safe-unfollow/blob/main/docs/instagram-export.md).

## Browser libraries

- **zip.js** (`@zip.js/zip.js`): streaming, Zip64, multi-GB via `BlobReader`; JSZip loads everything into memory — rejected.
- **pdf-lib** + `@pdf-lib/fontkit`: embeds JPEG without re-encoding, custom TTF fonts (Lora, Albert Sans bundled under OFL), runs in a Worker. Instagram media are ≤ 1080 px → ≈ 130 dpi at 21 cm (fine for consumer PDFs; print shops prefer 150–300 dpi).

## Print-on-demand providers (future)

| Provider | Notes |
| --- | --- |
| Gelato | API + 130 production sites; PDF/X-4, 4 mm bleed, 150–300 dpi, GRACoL 2006 output intent |
| Peecho | Photobook-focused print API; adds bleed/crop marks itself |
| Cloudprinter | Print API with a network of local printers |

## Design-project research PDF

The design project also contains `uploads/printagram-research.pdf` (9 pages). The design-sync tool caps file reads at 256 KB and the PDF and its page renders are larger, so it could not be pulled into this repository. The v4 design already encodes its conclusions (pricing, FAQ copy, retention rules); drop the PDF into `docs/research/` if it should be versioned here.
