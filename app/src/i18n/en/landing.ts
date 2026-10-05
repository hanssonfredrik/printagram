import type { Faq } from '@/seo/text';

/** Landing page: header, hero, how it works, sample spreads, pricing and FAQ. */
export const landing = {
  myBooks: 'My books',
  signIn: 'Sign in',
  start: 'Start your book',
  testMode: 'Test mode',
  testModeTitle: 'Payments are in test mode. No money is taken.',
  hero: {
    title: 'Your Instagram, as a real book.',
    lead: 'Inbunden turns your Instagram posts into a print‑ready photo book. Pick the photos from a year, a trip or a first year. We lay out the pages and you get a PDF to keep. Printed books are coming soon.',
    price: (price: string) => `PDF ${price}`,
    noPassword:
      'We never ask for your Instagram password. You download your photos from Instagram and upload the file here.',
  },
  how: {
    title: 'How it works',
    steps: [
      {
        title: 'Bring in your photos',
        text: 'Ask Instagram for a [copy of your posts](guideInstagramExport) and upload the ZIP it emails you. Or send your posts to Google Photos and pick them there.',
      },
      {
        title: 'Pick',
        text: 'Choose whole months or years, or single photos. Every photo in a carousel comes along.',
      },
      {
        title: 'Print',
        text: 'Preview every page, then download your print‑ready PDF and [print it](guidePrint) wherever you like.',
      },
    ],
  },
  samples: {
    title: 'Sample spreads',
    intro:
      'Real pages made by Inbunden: one to four photos per page, full‑bleed or framed, text pages, captions if you want them.',
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
      text: 'Your book printed with a soft cover.',
    },
    hardcover: {
      title: 'Hardcover book',
      text: 'Your book printed with a hard cover.',
    },
  },
  faqTitle: 'Questions',
  guidesTeaser:
    'More on exporting from Instagram, printing the PDF and choosing a photo book service:',
  guidesLink: 'read the guides',
  /** `{price}` is replaced with the PDF price from the config; `when` follows the feature flags. */
  faq: [
    {
      q: 'What is Inbunden?',
      a: 'A web service from Sweden that turns your Instagram posts into a photo book. You pick the photos, we lay out the pages and you download a print‑ready PDF for {price}. You can print it at any print shop or keep it as it is.',
    },
    {
      q: 'What does it cost?',
      a: '{price} per book for the print‑ready PDF, whatever the number of photos or pages. No subscription. Printed softcover and hardcover books are coming soon.',
    },
    {
      q: 'Is it safe?',
      a: 'Yes. You download your own photos from Instagram and upload the file here. We never log in to your account, never see your password and can never post anything.',
    },
    {
      q: 'Can I connect my Instagram directly?',
      a: "Not yet. We're waiting for Instagram to approve Inbunden. Until then, use the export. It works for every account, but Instagram needs a few hours to a couple of days to prepare the file.",
      when: 'noConnect',
    },
    {
      q: 'Can I connect my Instagram directly?',
      a: "Yes, if you have a Creator or Business account. You sign in on Instagram's own page and we never see your password. Personal accounts use the export, which works for every account.",
      when: 'connect',
    },
    {
      q: 'Do private accounts work?',
      a: 'Yes. The export works for private accounts too, and your account stays private.',
    },
    {
      q: 'How long does the Instagram export take?',
      a: "Usually a few hours, sometimes a day or two. Instagram emails you a download link when it's ready. We'll send you a return link so you can pick up where you left off. The guide on [downloading your Instagram data](guideInstagramExport) shows every step, and [what to do when the export goes wrong](guideExportProblems).",
    },
    {
      q: 'What happens to my photos?',
      a: 'They stay in your Inbunden library for 3 months so you can make more books without importing again. Every new book extends that by 3 months. You can delete them yourself any time. Otherwise we delete them when the 3 months are up, and email you a week before. Ordered PDFs stay downloadable either way.',
    },
    {
      q: 'What do I get right now?',
      a: 'A high‑resolution PDF you can print at any print shop. Printed books shipped to you are coming soon.',
    },
    {
      q: 'What exactly is in the PDF?',
      a: 'One page per book page, the cover first. Square (21 × 21 cm) or portrait (21 × 28 cm), with 4 mm of bleed and a trim box, your original photos embedded without re‑compressing, and sRGB colour. Up to 999 photos per book, one to four per page.',
    },
    {
      q: 'Where can I print it?',
      a: 'At any print shop or online photo book printer that accepts PDF files. Our [printing guide](guidePrint) lists what to ask for: size, bleed, paper and binding.',
    },
    {
      q: 'Can I use Google Photos?',
      a: "Yes. Instagram can send a copy of your posts to Google Photos, and then you pick them in Google's own picker. You can also pick any other photos you have there. We only see the photos you choose. Captions and likes don't come along that way, and the date can be the day of the transfer.",
      when: 'googlePhotos',
    },
    {
      q: 'Can I edit the layout?',
      a: 'Yes. We lay the pages out for you, then you can pick a layout per page (one photo, two, three or four, or full‑bleed), drag photos between pages, add text pages and choose the cover, title, format and captions. The preview is exactly what prints.',
    },
    {
      q: 'How is Inbunden different from other photo book services?',
      a: 'Most services print and ship the book, and you build it in their editor. Inbunden builds the book from your Instagram posts and gives you the PDF, so you choose where to print it. See [how the services compare](guideCompare).',
    },
  ] as Faq[],
};
