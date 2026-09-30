# Crimson as a print-on-demand partner

Research date: 30 September 2026. Every price below is Crimson's public list price incl. Swedish VAT unless stated; figures marked ≈ are computed from their listed per-page rate and must be confirmed. Open questions for Crimson are collected in [§8](#8-questions-to-ask-crimson).

## 1. TL;DR

- **Yes, Crimson has a print-on-demand API.** Crimson Färglabb AB in Hägersten, Stockholm, launched print-on-demand, dropshipping and white label on 16 October 2025. The API ("CAPI" v1) is REST/JSON with public OpenAPI docs, order webhooks, PostNord tracking and neutral packaging.
- **Three things block a decision:**
  1. The API key is partner-only and each key gets its own product set. It is **not confirmed** that a photo book made from *our* PDF ("Fotobok Egen PDF") is available as an API product; today that product is ordered manually over FTP and quoted individually.
  2. It **ships to Sweden and Norway only**. Our EU customers cannot be served through Crimson.
  3. The API price is Crimson's retail list price. A 20×20 cm hardcover costs **450 kr (24 pages)** to **≈486 kr (48 pages)** incl. VAT, before shipping. At a 549–599 kr retail price the margin is thin.
- **Recommendation:** treat Crimson as the Sweden-first candidate, but do not build against it until the three questions are answered. Ask Markbladet (Skene) the same questions in parallel, and keep the print provider behind an abstraction (like `PAYMENT_PROVIDER`) so an EU provider (Prodigi, Gelato, Cloudprinter) can be added later. Prodigi and Lulu have public sandboxes that we can prototype against today.

## 2. Who Crimson is

| | |
| --- | --- |
| Legal name | Crimson Färglabb Aktiebolag, org nr 556183-6957 |
| Address | Elsa Brändströms gata 52, 129 52 Hägersten (Fruängen), Stockholm |
| Size | ~23 employees, ~35.7 MSEK revenue and ≈ −2.0 MSEK result in 2024 ([allabolag](https://www.allabolag.se/foretag/crimson-f%C3%A4rglabb-aktiebolag/h%C3%A4gersten/fotografer/2JZDGV1I5YE4D)) |
| History | Founded 1971 by Håkan Holmberg; calls itself "Skandinaviens ledande proffsfotolabb och digitalt tryckeri"; ~150,000 customers, 98 % of orders online ([fotosidan 2023](https://www.fotosidan.se/cldoc/reportage/crimson-fem-decennier-som-printproffs.htm)) |
| Products | Photo prints (Fujicolor Crystal Archive, Hahnemühle, Canson), photo books and calendars, canvas, framing, direct print on board, printed matter, film scanning ([crimson.se](https://crimson.se)) |
| Press | HP Indigo 7900 bought in 2023; photo books printed in-house in Stockholm ([fotosidan 2023](https://www.fotosidan.se/cldoc/news/crimson-borjar-med-fotobocker.htm)) |
| Sustainability | All production in-house under Swedish environmental rules, on-site treatment of photo-chemical waste, own local deliveries. No FSC/PEFC statement found. |
| Turnaround | Photo books ready in 5–7 days, plus PostNord transit ([prislista](https://crimson.se/support/prislista/fotobocker)) |

### Photo book range

| | |
| --- | --- |
| Formats | **20×20 cm**, 28×28 cm, A4 landscape, A4 portrait, A5. No 21×21 or 30×30. |
| Covers | Softcover, hardcover, hardcover with dust jacket. Lay-flat only in A4 landscape and 28×28. |
| Pages | Softcover 24–100, hardcover 24–200 |
| Paper | "Galerie Art Silk" (gsm not published) |

Sources: [prislista fotoböcker](https://crimson.se/support/prislista/fotobocker), [guide: så skapar du fotoböcker](https://crimson.se/support/guider/tjanster/fotobocker-sa-skapar-du).

Our `square` format is 210×210 mm (`shared/src/layout.ts:11`). Crimson's nearest is 20×20 cm, so the layout engine needs a 200×200 page size for Crimson products, or we adopt 20×20 as the printed square.

## 3. The API (verified from the live OpenAPI spec)

- Launch note: [fotosidan, 16 Oct 2025](https://www.fotosidan.se/cldoc/news/crimson-erbjuder-print-on-demand.htm). Programme page: [crimson.se/support/foretagskund/crimson-dropshipping](https://crimson.se/support/foretagskund/crimson-dropshipping).
- Docs: Swagger at <https://api.crimson.se/docs>, ReDoc at <https://api.crimson.se/redoc>, spec at <https://api.crimson.se/v1/openapi.json> (OpenAPI 3.1, title "CAPI", version 1.0.0).

### Access and authentication

- Docs are public; **access is partner-only**. Apply for a "CAPI license key" through the contact form, describing the e-commerce platform. After approval you get one key.
- **Each key has its own predefined product set.** `GET /v1/products/` lists them with id, description, number of files required and price. Whether "Fotobok Egen PDF" can be in that set is the first thing to ask.
- Authentication is an API key sent as the **`apikey` query parameter**. That is weak (keys end up in logs), so the key must live only in Functions app settings and never reach the browser.

### Endpoints

| Call | Purpose |
| --- | --- |
| `GET /v1/products/` | The products this key may order (id, description, file count, price) |
| `POST /v1/order/` | `CreateOrder`: `instance_id` (our order id), `end_customer` (name, company, address, email, phone), `products[]` with `id`, `quantity`, optional `price`, `files[]`; optional HTTPS `callback`; optional `total_price` / `shipping_price` (what the end customer paid) |
| `POST /v1/uploadfiles/{instance_id}`, `POST /v1/uploadfile/{instance_id}/{file_id}` | Multipart upload of the print files |
| `GET /v1/order/{instance_id}` | Order status; once READY it carries Crimson's OT number, shipping method, weight and price |

Files can be attached in four ways: a **public URL that Crimson fetches** (optional MD5), a file already in the account's SFTP archive, an SFTP upload under a Crimson-assigned filename, or an upload into the per-order SFTP folder.

### Order lifecycle and webhooks

- Statuses: `ERROR`, `CREATED`, `WAITING FOR FILES`, `READY`, `FAILED`, `CLOSED`.
- The `callback` URL (HTTPS required) receives an `OrderStatus` payload at **READY, SHIPPED, CLOSED and CANCELLED**. Retries may arrive **out of order**; every call carries an `Idempotency-Key` header, so we must store handled keys the way `api/src/functions/stripeWebhook.ts` stores Stripe event ids.
- A `Shipment` object has carrier (default "Postnord"), package, weight, price and **tracking numbers**.
- Error alerts go by email to the account contact. An order that has not reached READY within 60 minutes triggers an "incomplete order" email.

### Test environment

No public sandbox. The spec describes a **Debug** mode where orders are registered but not queued for production and callbacks still fire. It appears to be a per-account setting (inference), so ask for it when applying.

### Shipping and packaging

- The address schema allows **country `SE` or `NO` only**; the dropshipping page says Sweden. No EU shipping.
- Carrier PostNord: varubrev 1:a klass or MyPack.
- **White label confirmed**: orders go out as if from us, nothing on the product or packaging mentions Crimson.

### Commercial terms

No minimums. Price is "the standard list price from the website" with **no POD surcharge**; we set our own margin. Volume or reseller discounts are not mentioned, and invoicing terms and SLA are not published.

## 4. File specs

Verified:

- For own-PDF books Crimson provides **InDesign master templates per format** (20×20, 28×28, A4, A5) and `Crimson_Print_Settings.zip` with a `Crimson_PDF_Export.joboptions` preset. Today the own-PDF book "hanteras manuellt och pris ges utifrån format, material och antal" ([Fotobok eget tryckoriginal](https://crimson.se/produkter/fotobocker/fotobok-eget-tryckoriginal)).
- General print-original guide: final size **+2 mm bleed** on all sides, 5 mm safety margin, **print-ready PDF in RGB** (not CMYK) exported with their joboptions, no bleed at the spine, brochure page counts divisible by 4. No PDF/X or FOGRA standard required; RGB is explicitly preferred ([trycksaker guide](https://crimson.se/support/guider/tjanster/trycksaker-anpassad-bestallning)).
- A 2018 third-party guide for a Crimson lay-flat book used 15 mm cover bleed, 3 mm inner bleed, ≈10 mm spine at 30 pages and per-spread JPEG export at 300 ppi ([pernillalindblom.se](https://www.pernillalindblom.se/guide-fotobok/)).

Unknown: paper gsm, spine-width formula, hardcover wrap dimensions, and whether the API product takes one PDF or cover + interior. These are probably in the templates and in the product's `files` count.

Good news for us: our PDF is already sRGB with an OutputIntent and TrimBox/BleedBox on every page (`app/src/workers/pdfBook.ts:308`, `:429-446`), which matches Crimson's RGB preference better than Gelato's CMYK/GRACoL requirement.

## 5. What a book costs

List prices incl. 6 % VAT for **20×20 cm** ([prislista](https://crimson.se/support/prislista/fotobocker)). Extra pages are listed as "6 kr per 4 pages" for 20×20; that rate is so low that the ≈ values need confirming.

| 20×20 cm | 24 pages | 48 pages | 100 pages |
| --- | --- | --- | --- |
| Hardcover | 450 kr | ≈486 kr | ≈564 kr |
| Hardcover with dust jacket | 439 kr | ≈475 kr | ≈553 kr |
| Softcover | 307 kr | ≈343 kr | ≈421 kr (softcover max) |

- Further copies of the same book: hardcover 370.20 kr, softcover 251.20 kr.
- Other formats for comparison: 28×28 hardcover 593 kr, A5 softcover 252 kr.
- Shipping: MyPack 79–159 kr depending on weight; pickup in Fruängen free.
- These are web-editor prices. Own-PDF books are quoted on request; the API price per product id is what `GET /v1/products/` returns.

### Worked margin, 20×20 hardcover, 48 pages, shipped in Sweden

| | Retail 549 kr | Retail 599 kr |
| --- | --- | --- |
| Customer pays (incl. 6 % VAT) | 549 kr | 599 kr |
| Net of VAT | 518 kr | 565 kr |
| Crimson book, net of VAT (≈486 / 1.06) | −458 kr | −458 kr |
| Shipping charged to customer (MyPack 79 kr, net 75 kr) vs cost | ±0 | ±0 |
| Stripe ≈ 1.5 % + 1.80 kr | −10 kr | −11 kr |
| **Gross margin** | **≈50 kr (9 %)** | **≈96 kr (16 %)** |

That is before a reseller discount, which we should ask for. Repeat copies (370.20 kr) leave a healthier margin for "order another copy".

### VAT

- **Printed photo books are 6 % VAT in Sweden.** Skatteverket treats an item with the form and appearance of a book as a book, customer-made photo books included; HFD 2011 not. 66 covers photographic books ([Skatteverket rättslig vägledning](https://www4.skatteverket.se/rattsligvagledning/edition/2025.2/377256.html), [extremaalbum.se](https://extremaalbum.se/moms-pa-bocker/) citing SKV dnr 202 261722-19/111).
- **Open question for our €9 PDF:** one source citing Skatteverket says *digital* photo books are 25 %. Sweden cut e-books to 6 % in 2019, but whether a single customer PDF counts as an e-book is unclear. Get tax advice; this affects the current product, not only printed books.

## 6. Alternatives

| Provider | API | Photo book formats | Indicative price, ~20×20 hardcover, 30–60 p | Production / shipping to Sweden |
| --- | --- | --- | --- | --- |
| **Crimson** (Stockholm) | Partner-only REST, webhooks, Debug mode | 20×20, 28×28, A4, A5; soft/hard/jacket | 450–486 kr incl. VAT (list) | Stockholm; SE + NO only |
| **Markbladet digitaltryck** (Skene) | "API mot era system" + back office; photo book dropshipping | Softcover, hardcover, lay-flat, from 1 copy; 2× HP Indigo B2 | Not public | Claims to be Sweden's largest personal-photo-book producer and prints for other brands (e.g. fotoklok.se). Strongest Swedish alternative. ([digitaltryckeri.nu](https://www.digitaltryckeri.nu/bokproduktion-25820297)) |
| **Gelato** | Public REST API; one PDF with cover + inner pages; cover-dimensions endpoint | Hard/soft, 30–200 pages, 170 gsm matte laminated; 20×20 offered | ≈ $19 retail on Gelato's demo store; "from $11.85" with subscription (third-party, unverified) | 140+ hubs in 32 countries; Sweden is a production country but photo-book production in Sweden unconfirmed ([gelato.com](https://www.gelato.com/custom/photo-books/hard-cover-photo-books/hardcover-photo-book), [cover dimensions](https://dashboard.gelato.com/docs/products/product/cover-dimensions/)) |
| **Prodigi** (UK) | Public API with **sandbox**; takes `pageCount`, returns spine size | Hardcover **21×21**, A5, A4, 24–300 p, PUR, even page counts; PDF/X-4 FOGRA39, RGB accepted | Not public | UK, EU, US fulfilment; 120 h production ([prodigi.com](https://www.prodigi.com/products/books-and-magazines/hardcover-photo-book/), [tech guide](https://www.prodigi.com/blog/photo-books-technical-guide/)) |
| **Lulu** (US) | Public API with **sandbox**; separate cover and interior PDFs by URL | 8.5×8.5" hardcover casewrap, premium colour | From ≈ $14.76 (third-party) | Global network; EU shipping cost unknown ([api.lulu.com/docs](https://api.lulu.com/docs/)) |
| **Cloudprinter** (NL) | REST API, SDKs, live pricing via API | 40+ sizes incl. square, 130–200 gsm coated, PDF/X-4 | Not public | Claims printing in Sweden, PostNord ([cloudprinter.com](https://www.cloudprinter.com/countries/local-printing-in-sweden-with-global-print-api)) |
| **Peecho** (NL) | Print API | Hardcover 24–298 p, 200 gsm gloss, lay-flat | Hardcover "from €5.20" excl. shipping/tax | Production 4–6 days, W. Europe 2–7 days ([peecho.com](https://www.peecho.com/products/books/hardcover)) |
| BoD Sweden | No API (author self-publishing) | Soft/hard, colour | Calculator only | Stockholm |

No public photo-book API was found for Printful, Printoteket, Scandinavian Book or Ifoto/Önskefoto.

## 7. What Inbunden lacks today

| Gap | Where |
| --- | --- |
| One PDF: cover, title page, content, back cover, all single pages at trim size. No cover spread, no spine, no page-count padding. | `shared/src/layout.ts:543-554`, `app/src/workers/pdfBook.ts:380` |
| Bleed is 4 mm (`PRINT_BLEED_MM`); Crimson wants 2 mm. | `shared/src/layout.ts:21`, `api/src/lib/config.ts:103` |
| Page size 210×210, Crimson prints 200×200. | `shared/src/layout.ts:11` |
| Instagram images ≤ 1080 px ≈ 130 dpi at 21 cm; no upscaling, only a warning. Acceptable for photo books, but below the 150–300 dpi printers ask for. | `docs/research.md` |
| Order has no binding/product field, no shipping address, currency fixed to `eur`. | `api/src/lib/tables.ts:110-146`, `shared/src/types.ts:100-127` |
| Order statuses stop at `ready`. | `shared/src/types.ts:19` |
| `printedBooksEnabled` is hardcoded `false`; "from" prices exist but nothing is orderable. | `api/src/functions/session.ts:13`, `api/src/lib/config.ts:43-52` |
| Daily cron deletes PDF blobs other than the order's current `pdfBlob`; a provider that fetches by URL later must not lose the file. | `api/src/functions/cron.ts:172-185` |

Reusable pieces: `readSasUrl` (`api/src/lib/blobs.ts:141`) for a fetch URL, the Stripe webhook idempotency pattern (`api/src/functions/stripeWebhook.ts`), the `payments/provider.ts` selector pattern, the cron task union (`api/src/functions/cron.ts:21`) driven by `.github/workflows/cron.yml`, and the `Mailer` templates in `api/src/lib/email.ts`.

## 8. Questions to ask Crimson

Paste into the contact form / first email.

1. Can a **"Fotobok Egen PDF"** in 20×20 cm, softcover and hardcover, be added to our CAPI product set? What are the product ids and how many files does each require (one PDF, or cover + interior)?
2. Please send the 20×20 templates, the spine-width formula per page count, paper gsm, and confirm 2 mm bleed and RGB PDF for photo books.
3. Is there a **reseller or volume price** below list price for CAPI orders? What are the invoicing terms (per order, monthly)?
4. Is the extra-page price really 6 kr per 4 pages for 20×20?
5. Can our account be put in **Debug mode** for integration testing, and can it be switched per order?
6. How long does Crimson keep a file URL valid before fetching? (We issue time-limited SAS links.)
7. Are there plans for **EU shipping** or a partner for it?
8. What is the SLA on production time, and how are reprints/claims handled when a customer's book arrives damaged?
9. Can the callback include the tracking URL, and is the `Idempotency-Key` stable across retries?

Ask Markbladet questions 1–3, 7 and 8 too.

## 9. Implementation plan

Provider-agnostic, Crimson first. Nothing here is started; Phase 0 has to happen before code is worth writing.

### Phase 0 — commercial (no code)

Apply for a CAPI key with Debug mode, send the questions above, and get the same answers from Markbladet. Decide the printed retail prices in SEK and EUR and whether the PDF stays a separate €9 product or is included with a printed book. Settle the 6 %/25 % VAT question with an accountant.

### Phase 1 — PDF output

- Add a `PrintProfile` in `shared/src/layout.ts`: trim size (200×200 for Crimson), bleed (2 mm), minimum pages (24), page-count multiple (4), whether a separate cover file is required. The current PDF-only profile keeps 210×210 and 4 mm.
- Pad the content with blank pages to the multiple, and cap at the product maximum (100 softcover / 200 hardcover).
- Extend `buildBookPdf` (`app/src/workers/pdfBook.ts`) to emit `interior` and, when the profile needs it, a `cover` spread (back + spine + front) whose width depends on the page count from Crimson's formula. Keep the sRGB OutputIntent.
- Extend `scripts/pdf-check.ts` to assert the profile's boxes and page count.

### Phase 2 — data model

- `OrderRow`: `binding: 'pdf' | 'softcover' | 'hardcover'`, `shippingAddress` (name, street, postal code, city, country `SE`|`NO`, phone, email), `print: { provider, externalId, status, tracking[], submittedAt, shippedAt }`, `currency`.
- `OrderStatus` gains `submitted | printing | shipped | delivered | cancelled`.
- `printedBooksEnabled` read from a setting (`FEATURE_PRINTED_BOOKS_ENABLED`); price table per binding, format and country in config next to `PRICE_*_FROM_CENTS`.

### Phase 3 — API

- `api/src/lib/print/provider.ts` with `submit(order, files)`, `status(order)`; `crimson.ts` and `fake.ts`, chosen by `PRINT_PROVIDER` (mirror `payments/provider.ts`).
- Crimson client: `POST /v1/order/` with `instance_id = order.id`, files as SAS URLs from `readSasUrl` with a TTL long enough for the fetch (or multipart upload if the fetch window is short), `callback = {SITE_URL}/api/print/crimson/webhook`. API key only from config.
- `functions/crimsonWebhook.ts`: verify HTTPS origin (Crimson sends no signature; consider a secret path segment), dedupe on `Idempotency-Key` in the Lookups table like `stripe_evt`, map READY/SHIPPED/CLOSED/CANCELLED to order statuses, send `orderShipped` email with tracking.
- Cron task `printStatus`: poll `GET /v1/order/{id}` for orders in `submitted`/`printing` older than N hours as a safety net.
- Cleanup guard in `cron.ts`: never delete `pdfBlob` (or cover blob) of an order that has a print job not yet `CLOSED`.
- Submit after `pdf/complete` when `binding !== 'pdf'`; the PDF download stays available to the customer as today.

### Phase 4 — UI

- Checkout: binding choice (PDF / softcover / hardcover) with prices, address form shown for printed bindings, country limited to SE/NO while Crimson is the only provider, delivery estimate (5–7 days + PostNord).
- My books and Done: print status, tracking link, "order another copy".
- i18n `sv`/`en` for all of the above; landing/FAQ copy changes from "coming soon" to the offer.

### Phase 5 — verification

- `api/test/routes.test.ts`: `vi.mock` the Crimson client like the Google Photos stub; cover submit, webhook dedupe, out-of-order callbacks, cleanup guard.
- End-to-end order in Crimson Debug mode, then one real paid order to the owner's address before enabling the feature flag in production.

## 10. Sources

- <https://crimson.se> · <https://crimson.se/support/foretagskund> · <https://crimson.se/support/foretagskund/crimson-dropshipping>
- <https://api.crimson.se/docs> · <https://api.crimson.se/redoc> · <https://api.crimson.se/v1/openapi.json>
- <https://crimson.se/support/prislista/fotobocker> · <https://crimson.se/support/guider/tjanster/fotobocker-sa-skapar-du> · <https://crimson.se/produkter/fotobocker/fotobok-eget-tryckoriginal> · <https://crimson.se/support/guider/tjanster/trycksaker-anpassad-bestallning>
- <https://www.fotosidan.se/cldoc/news/crimson-erbjuder-print-on-demand.htm> · <https://www.fotosidan.se/cldoc/reportage/crimson-fem-decennier-som-printproffs.htm> · <https://www.fotosidan.se/cldoc/news/crimson-borjar-med-fotobocker.htm>
- <https://www.allabolag.se/foretag/crimson-f%C3%A4rglabb-aktiebolag/h%C3%A4gersten/fotografer/2JZDGV1I5YE4D>
- <https://www.pernillalindblom.se/guide-fotobok/>
- <https://www4.skatteverket.se/rattsligvagledning/edition/2025.2/377256.html> · <https://extremaalbum.se/moms-pa-bocker/>
- <https://www.gelato.com/custom/photo-books/hard-cover-photo-books/hardcover-photo-book> · <https://gelato-demo.myshopify.com/products/hardcover-photo-book> · <https://dashboard.gelato.com/docs/products/product/cover-dimensions/> · <https://www.gelato.com/print-on-demand/sweden>
- <https://www.peecho.com/products/books/hardcover> · <https://www.peecho.com/solutions/print-api>
- <https://www.cloudprinter.com/products/photobook-print-online-worldwide> · <https://www.cloudprinter.com/countries/local-printing-in-sweden-with-global-print-api>
- <https://api.lulu.com/docs/> · <https://help.api.lulu.com/en/support/solutions/articles/64000254607>
- <https://www.prodigi.com/products/books-and-magazines/hardcover-photo-book/> · <https://www.prodigi.com/blog/photo-books-technical-guide/> · <https://www.prodigi.com/print-api/docs/reference/>
- <https://www.digitaltryckeri.nu/> · <https://www.digitaltryckeri.nu/bokproduktion-25820297>
- <https://www.bod.se/bok/print-on-demand>
