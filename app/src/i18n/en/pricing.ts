import type { Faq } from '@/seo/text';

/**
 * Pricing page (/pricing): the PDF price, what it includes, what printing adds and how it compares.
 * `{price}` is the PDF price from the config, as on the landing page. The three price cards reuse
 * landing.pricing so both pages say the same thing.
 */
export const pricing = {
  title: 'Pricing',
  lead: 'An Inbunden photo book costs {price} as a print-ready PDF, whatever the number of photos or pages. No subscription, no account fee. Printed books are on the way.',
  cardsTitle: 'What you can order',
  included: {
    title: 'What the PDF includes',
    items: [
      'Up to 999 photos and any number of pages, for the same price',
      'Automatic layout in date order, then your changes: one to four photos per page, full-bleed or framed, text pages, your own cover and title',
      'Square (21 × 21 cm) or portrait (21 × 28 cm)',
      'Print-ready: 4 mm of bleed, a trim box, your original photos embedded without re-compressing, and sRGB colour',
      'Captions and dates under the photos if you want them',
      'A preview of every page before you pay. The preview is exactly what prints',
      'Download it again any time from My books, and share a link to the PDF',
      'Your photos stay in your library for 3 months, so a second book needs no new import',
    ],
  },
  examples: {
    title: 'Same price, whatever the book',
    intro:
      'Most photo book services charge per page. Inbunden does not, so a long book costs no more than a short one:',
    rows: [
      { label: 'A trip, 30 photos, about 16 pages', value: '{price}' },
      { label: 'A first year, 150 photos, about 60 pages', value: '{price}' },
      { label: 'Ten years of Instagram, 900 photos, about 300 pages', value: '{price}' },
    ],
    note: 'Page counts depend on the layouts you pick. The preview shows the exact number before you pay.',
  },
  printing: {
    title: 'What printing costs',
    paragraphs: [
      'The PDF is yours to print anywhere: a print shop in town, an online photo book printer or your own printer. You pay the printer for paper, binding and shipping, and that part depends on size, page count and cover. Our [printing guide](guidePrint) lists what to ask for and how to compare quotes.',
      'Printed softcover and hardcover books from Inbunden are coming soon, at the prices above. Until then the PDF is the only product, and it stays available after the printed books arrive.',
    ],
  },
  compare: {
    title: 'Compared with other photo book services',
    paragraphs: [
      'Most services sell a printed book, price it by page count and format, and have you build it in their editor. Inbunden builds the book from your Instagram posts, in date order with captions, and sells you the file. You choose the printer and the paper. The guide to [Instagram photo book services compared](guideCompare) goes through the options and their prices.',
    ],
  },
  payment: {
    title: 'Paying',
    items: [
      'Card, Apple Pay and Google Pay. Klarna in Sweden.',
      'Euros on the English site, kronor on the Swedish site. The language of the site picks the currency.',
      'Prices include VAT where it applies. You see the total before you pay.',
      'Discount codes go in at checkout.',
      'If the PDF cannot be made, or has a fault that is our doing, we fix it or refund you in full. Write to hello@inbunden.com.',
    ],
  },
  faqTitle: 'Questions about the price',
  faq: [
    {
      q: 'Is there a subscription or an account fee?',
      a: 'No. You pay {price} per book when you order it, and nothing before or after. Your account, your library and the preview are free.',
    },
    {
      q: 'Why does the price not depend on the number of pages?',
      a: 'Because the PDF costs us the same to make whether it has 10 pages or 300. Printing is where page count costs money, and you pay the printer for that directly.',
    },
    {
      q: 'Can I change the book after I have bought it?',
      a: 'Yes. Open the book in My books, duplicate it, change what you like and order the new version as a new PDF for {price}. The PDF you already bought stays downloadable.',
    },
    {
      q: 'Do I pay before I see the book?',
      a: 'No. You import your photos, pick the posts and preview every page first. Payment comes last, and the preview is exactly what prints.',
    },
    {
      q: 'What does a printed copy cost?',
      a: 'That depends on the printer, the size, the number of pages and the cover. Ask a print shop for a quote for a 21 × 21 cm or 21 × 28 cm book with 4 mm bleed, or upload the PDF to an online photo book printer and see its price. The [printing guide](guidePrint) explains the choices.',
    },
    {
      q: 'Can I get my money back?',
      a: 'The PDF is a digital download, so there is no return once it is made. If it cannot be produced or has a fault that is our doing, we fix it or refund you in full.',
    },
  ] as Faq[],
  start: 'Start your book',
  updated: (date: string) => `Updated ${date}`,
};
