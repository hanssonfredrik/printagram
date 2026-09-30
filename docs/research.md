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

### Private accounts (checked 26 Sep 2026)

There is no API for private accounts, and there cannot be one under Meta's model:

- Meta: *"To use the APIs, your app users must have an Instagram professional account."* Personal accounts lost all API access when Basic Display was shut off on 4 Dec 2024.
- **Professional (Business and Creator) accounts cannot be private.** Instagram forces them public; to go private the user must switch back to personal. So private ⇒ personal ⇒ no API. The Connect path can only ever serve public professional accounts; "switch, import, switch back" works but makes the account public meanwhile (the UI says so).
- Competitors confirm it: Chatbooks dropped Instagram as a source after Dec 2024 and takes camera-roll uploads instead.
- Unofficial routes (instagrapi/HikerAPI private mobile API, browser extensions, scrapers) need the user's password or session, breach Instagram's terms, trigger bans and have drawn DMCA takedowns. Rejected for a paid product.

Sources: [overview](https://developers.facebook.com/docs/instagram-platform/overview/), [TechCrunch on the shutdown](https://techcrunch.com/2024/12/06/instagram-locks-out-developers-of-third-party-consumer-apps), [Chatbooks](https://help.chatbooks.com/en/articles/10139802-instagram-as-a-photo-source), [Creator accounts are public](https://sproutsocial.com/insights/instagram-creator-account/), [scraper ban risk](https://www.socialcrawl.dev/blog/instagram-scraping-2026).

### Meta Data Portability: becoming a "Transfer a copy of your information" destination (future)

The one compliant route where **Meta pushes a user's photos to a third party by API, for any account type including private personal ones**. It powers Accounts Center → Transfer a copy of your information (destinations today: Google Photos, Dropbox, Koofr, Backblaze, Photobucket, plus small startups such as Fabric, Koodos and MyLize since the DTI registry went post-pilot in April 2026) and is Meta's vehicle for the EU DMA Art. 6(9) "continuous and real-time" portability duty.

- Roles are reversed: **Inbunden would be the OAuth 2.0 provider and Meta the client.** Meta sends the user to our authorize URL, exchanges the code at our token URL, then its Data Transfer Project worker POSTs items to our HTTP API ("Universal Adapters": *"implement an HTTP API conforming to the Generic Importers API specification"*, any language; the alternative is a Java adapter in the DTP repo).
- Data from Instagram: Photos and Videos (posts and stories) and Social Posts. Photo items carry title, description (caption), uploadedTime and a favorite flag; no like counts.
- Meta documents deep linking, so a "Send my Instagram to Inbunden" button could open the transfer with Inbunden, `date_range=ALL_TIME` and a cadence (one-time, or recurring up to daily for 3 years) preselected. Transfers are asynchronous; no ZIP, nothing on the user's device.
- Prerequisites: (1) **DTI Data Trust Registry Level 1** (photos/videos/posts; only archives need Level 2): company registration number (LEI/DUNS), homepage, privacy policy covering collection/use/sharing/protection/retention and data-subject rights, security contact, service description — granted from the form, no audit. (2) **Verified Meta Business Manager** (the same business verification App Review needs). (3) A **Data Transfer app** on developers.facebook.com ("Allow users to transfer their data to other apps"); Meta engineers run end-to-end test transfers; release on request to dataportability@meta.com. Meta then monitors endpoint availability and success rate and can delist a destination.
- Unknowns: approval timeline for a small company; whether Meta pushes bytes or a fetchable URL (matters for the 30 MB / 45 s managed-Functions limits); exact Generic Importers request shape. A Dutch open-source family archive verified the protocol in 2026 and reports it "implementable, external approval required" with Meta doing HTTP POST per item.

Sources: [Data Portability](https://developers.facebook.com/docs/data-portability/), [overview](https://developers.facebook.com/docs/data-portability/overview), [get started](https://developers.facebook.com/docs/data-portability/get-started), [onboarding guide](https://developers.facebook.com/docs/data-portability/onboarding-guide), [FAQ](https://developers.facebook.com/docs/data-portability/data-port-faq/), [DTI registry](https://dt-reg.org/about/), [application guide](https://www.dt-reg.org/application-guide/), [DTI post-pilot](https://dtinit.org/blog/2026/04/28/dtr-now-post-pilot), [Fabric, first EYI destination](https://onfabric.substack.com/p/build-personal-context-into-your), [Koofr transfer flow](https://koofr.eu/help/koofr-integrations/how-can-i-transfer-posts-and-stories-with-my-mobile-instagram-app/), [Bewora EYI implementation](https://github.com/Hylke75/Digitaal-Familiearchief/pull/17).

## Google Photos (Picker API) — the built fallback for private accounts

Instagram → Google Photos already works for every account through Meta's own transfer tool; Google Photos is then read with the **Picker API**, the only third-party read path since the Library API stopped exposing user libraries on 31 Mar 2025.

- Scope `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Flow: `POST /v1/sessions` → user opens `pickerUri` (append `/autoclose`) and picks in Google Photos → poll `GET /v1/sessions/{id}` until `mediaItemsSet` → `GET /v1/mediaItems?sessionId=…` (100 per page) → download `baseUrl=d` **with the bearer token** (base URLs expire after 60 min) → `DELETE /v1/sessions/{id}`.
- `PickedMediaItem` has id, type, createTime and mediaFile (baseUrl, mimeType, filename, width/height). **No caption/description field**, no album grouping, no likes. `createTime` is the capture time when the file has EXIF; Instagram-processed JPEGs usually have none, so it is often the transfer time. `api/src/lib/exif.ts` reads DateTimeOriginal ourselves when present.
- Downloads need the Authorization header, so the copy runs server-side as a bounded job (like connect), not in the browser.
- Google OAuth: access token 1 h (`access_type=online`, nothing stored beyond the import). App verification: brand verification (Search Console domain ownership, published consent screen, privacy policy URL) plus scope justification with a demo video; typically days; up to 100 test users before verification.

Sources: [Picker launch](https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/), [get started](https://developers.google.com/photos/picker/guides/get-started-picker), [media items](https://developers.google.com/photos/picker/guides/media-items), [mediaItems reference](https://developers.google.com/photos/picker/reference/rest/v1/mediaItems), [scopes](https://developers.google.com/photos/overview/authorization), [verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification).

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
| Crimson (Stockholm) | Partner-only REST API with webhooks, white label, PostNord; 20×20 hardcover 450 kr list incl. VAT; ships SE/NO only. Full analysis: `docs/crimson-print-on-demand.md` |
| Prodigi | Public API with sandbox; 21×21 hardcover, PDF/X-4 FOGRA39, returns spine size; EU fulfilment |
| Lulu | Public API with sandbox; separate cover + interior PDFs by URL |
| Markbladet digitaltryck (Skene) | Swedish photo-book producer for other brands; API on request; strongest Swedish alternative to Crimson |

## Design-project research PDF

The design project also contains `uploads/printagram-research.pdf` (9 pages). The design-sync tool caps file reads at 256 KB and the PDF and its page renders are larger, so it could not be pulled into this repository. The v4 design already encodes its conclusions (pricing, FAQ copy, retention rules); drop the PDF into `docs/research/` if it should be versioned here.
