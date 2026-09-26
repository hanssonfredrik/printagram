/** Landing page: header, hero, how it works, sample spreads, pricing and FAQ. */
export const landing = {
  myBooks: 'My books',
  signIn: 'Sign in',
  start: 'Start your book',
  testMode: 'Test mode',
  testModeTitle: 'Payments are simulated. No money is taken.',
  hero: {
    title: 'Your Instagram, as a real book.',
    lead: 'Pick the photos, we lay out the pages. A year, a trip, a first year — as a print‑ready PDF you keep forever. Printed books are coming soon.',
    price: (price: string) => `PDF ${price}`,
    noPassword:
      "We never ask for your password. Connect through Instagram's own login, or upload your export.",
  },
  how: {
    title: 'How it works',
    steps: [
      {
        title: 'Bring in your photos',
        text: 'Connect your Instagram in seconds, or upload the export Instagram sends you. Either way, we never see your password.',
      },
      {
        title: 'Pick',
        text: 'Choose by month or year (or most liked, when you connect). Carousels included.',
      },
      { title: 'Print', text: 'Preview every page, then download your print‑ready PDF.' },
    ],
  },
  samples: {
    title: 'Sample spreads',
    intro:
      'Real pages from the layout engine: one to four photos per page, full‑bleed or framed, text pages, captions if you want them.',
    bookTitle: 'Our year · 2025',
    yearText: '2025\nin 84 photos',
    spreads: {
      trip: 'A trip',
      summer: 'A summer',
      year: 'A year in review',
    },
    captions: {
      sunset: 'Last light at Costa Nova',
      rooftops: 'Alfama rooftops',
      beach: 'Lisbon, March',
      mountains: 'Up early for this one',
      flowers: 'Garden, finally',
      coffee: 'Sunday',
      forest: 'Long walk',
      city: 'Night bus home',
    },
  },
  pricing: {
    title: 'Pricing',
    intro: 'One price for the PDF, however many photos and pages your book has.',
    from: (price: string) => `from ${price}`,
    comingSoon: 'Coming soon',
    pdf: {
      title: 'Digital PDF',
      text: 'Print‑ready PDF, download instantly.',
      note: 'Available now',
    },
    softcover: {
      title: 'Softcover book',
      text: 'Printed and shipped to your door.',
    },
    hardcover: {
      title: 'Hardcover book',
      text: 'Linen‑wrapped, lay‑flat pages.',
    },
  },
  faqTitle: 'Questions',
  faq: [
    {
      q: 'Is it safe?',
      a: "Yes. If you connect, you log in on Instagram's own site and Instagram lets us read your posts — nothing more. We can't post, message or see your password. If you upload, you download your own photos from Instagram and drop the file here. We never touch your account.",
    },
    {
      q: 'Connect or upload — which one?',
      a: 'Connect if you have a Creator or Business account: it takes seconds and brings your likes along. Upload the export if you have a personal account and want to keep it that way. It works for every account, but Instagram needs a few hours to a couple of days to prepare the file.',
    },
    {
      q: 'Do private accounts work?',
      a: 'Yes, with the export. Connecting needs a Professional account, and Instagram makes those public — so if you want to stay private, use the export.',
    },
    {
      q: 'How long does the Instagram export take?',
      a: "Usually a few hours, sometimes a day or two. Instagram emails you a download link when it's ready. We'll send you a return link so you can pick up where you left off.",
    },
    {
      q: 'What happens to my photos?',
      a: 'They stay in your Printagram library for 3 months so you can make more books without importing again. Every new book extends that by 3 months. Delete them yourself anytime, or we delete them when the 3 months are up — after a reminder email. Ordered PDFs stay downloadable either way.',
    },
    {
      q: 'What do I get right now?',
      a: 'A high‑resolution PDF you can print at any print shop. Printed books shipped to you are coming soon.',
    },
    {
      q: 'Can I edit the layout?',
      a: 'Yes. We lay the pages out for you, then you can pick a layout per page (one photo, two, three or four, or full‑bleed), drag photos between pages, add text pages and choose the cover, title, format and captions. The preview is exactly what prints.',
    },
  ],
};
