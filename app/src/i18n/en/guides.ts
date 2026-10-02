/** Guide pages (/guides/...): long-form how-tos. Facts must match the product. */

export interface GuideSection {
  title: string;
  paragraphs?: string[];
  /** Numbered steps. */
  steps?: { title: string; text: string }[];
  bullets?: string[];
  /** Renders the Instagram export steps from exportFlow.guide.steps (one source for both). */
  exportSteps?: 'mobile' | 'desktop';
}

export interface Guide {
  /** H1 and page title. */
  title: string;
  /** Meta description and the card text on the guides index. */
  description: string;
  /** The answer in two or three sentences, right under the H1. */
  lead: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
}

export interface GuidesMessages {
  index: { title: string; lead: string; read: string };
  breadcrumb: string;
  breadcrumbLabel: string;
  updated: (date: string) => string;
  faqTitle: string;
  related: string;
  cta: { title: string; text: string; button: string };
  items: {
    guideInstagramBook: Guide;
    guideInstagramExport: Guide;
    guidePrint: Guide;
  };
}

export const guides: GuidesMessages = {
  index: {
    title: 'Guides',
    lead: 'How to turn your Instagram into a photo book, from getting the photos out of Instagram to holding the printed book.',
    read: 'Read the guide',
  },
  breadcrumb: 'Guides',
  breadcrumbLabel: 'Breadcrumb',
  updated: (date) => `Updated ${date}`,
  faqTitle: 'Questions',
  related: 'More guides',
  cta: {
    title: 'Ready to make yours?',
    text: 'Bring in your photos, pick the ones you want and preview every page before you pay.',
    button: 'Start your book',
  },
  items: {
    guideInstagramBook: {
      title: 'How to make a photo book from your Instagram',
      description:
        'Make a photo book from your Instagram posts: get your photos out of Instagram, pick the posts, adjust the layout and download a print-ready PDF.',
      lead: 'To make a photo book from Instagram you need your photos out of Instagram, a way to choose the posts and a layout that prints well. With Inbunden you upload your Instagram export, pick the posts and download a print-ready PDF. It takes a few minutes, plus the time Instagram needs to prepare the export.',
      sections: [
        {
          title: 'Step 1: Get your photos out of Instagram',
          paragraphs: [
            'Instagram has no "print a book" button, so the photos have to come out first. There are two ways, and neither asks for your Instagram password:',
          ],
          bullets: [
            'Data export: ask Instagram for a copy of your posts and upload the ZIP it emails you. It works for every account, private ones included. Instagram needs a few hours to a couple of days to prepare it.',
            'Google Photos: ask Instagram to send a copy of your posts to Google Photos, then pick them in Google’s own picker.',
            'Connecting your Instagram account directly is coming soon. We’re waiting for Instagram to approve Inbunden.',
          ],
        },
        {
          title: 'Step 2: Choose the posts',
          paragraphs: [
            'A book works best with a theme: a year, a trip, a child’s first year. Inbunden groups your posts by month and year, so you can tick whole periods at once or pick single photos. Carousel posts come with every photo in them.',
            'A book holds up to 999 photos. The PDF has no minimum or maximum page count, and the price stays the same whatever the number of pages.',
          ],
        },
        {
          title: 'Step 3: Check the layout and adjust it',
          paragraphs: [
            'Inbunden lays out the pages for you in date order, with one to four photos per page, full-bleed or framed. Then you can change anything:',
          ],
          bullets: [
            'the layout of each page: one, two, three or four photos, or full-bleed',
            'the order, by dragging photos between pages',
            'text pages for a title, a date or a few words',
            'the cover photo, the title and the format: square (21 × 21 cm) or portrait (21 × 28 cm)',
            'captions and dates under the photos, on or off',
          ],
        },
        {
          title: 'Step 4: Download the print-ready PDF',
          paragraphs: [
            'The preview is exactly what prints. When you are happy, you pay once and download a high-resolution PDF. Every page has 4 mm of bleed and a trim box. Your photos are embedded as the original files, never re-compressed, and the colour is tagged as sRGB, so a print shop can print the file as it is.',
            'Instagram stores photos at up to 1080 pixels wide. That looks good when a photo takes half or a quarter of a page, but can look soft across a full page. The preview warns you about any photo that is too small for its spot, before you pay.',
          ],
        },
        {
          title: 'Step 5: Print it',
          paragraphs: [
            'Take the PDF to any print shop or online photo book printer that accepts PDF files. The guide to printing your photo book lists the settings to ask for. Printed books from Inbunden, shipped to your door, are coming soon.',
          ],
        },
      ],
      faq: [
        {
          q: 'Can I make a photo book from a private Instagram account?',
          a: 'Yes. Instagram’s data export works for private accounts, and your account stays private.',
        },
        {
          q: 'Are captions and dates included?',
          a: 'Only if you want them. You can show captions and dates under the photos or leave them out, for the whole book.',
        },
        {
          q: 'Do videos work?',
          a: 'A book is printed, so Inbunden uses your photos. Videos and Reels are left out of the book.',
        },
      ],
    },
    guideInstagramExport: {
      title: 'How to download your Instagram data (photos and posts)',
      description:
        'Step by step: request a copy of your Instagram posts in Accounts Center, choose the right format and quality, and download the ZIP when Instagram emails you.',
      lead: 'You can download everything you have posted on Instagram from Accounts Center → Your information and permissions → Export your information. Choose Posts, All time, JSON and the highest media quality. Instagram then emails you a download link, usually within a few hours. The link works for four days.',
      sections: [
        {
          title: 'Before you start',
          bullets: [
            'It works for every account: personal, private, Creator and Business.',
            'Instagram may ask for your password to confirm the request. You type it in Instagram, never on Inbunden.',
            'Choose Posts only. The file gets much smaller, and your posts are all Inbunden needs.',
          ],
        },
        { title: 'On your phone (Instagram app)', exportSteps: 'mobile' },
        { title: 'On a computer (instagram.com)', exportSteps: 'desktop' },
        {
          title: 'Why JSON and the highest quality?',
          paragraphs: [
            'JSON keeps the dates, captions and carousel order in a form software can read reliably. HTML is meant for reading in a browser. The highest media quality gives you the largest copies Instagram has kept, which is what you want in print.',
          ],
        },
        {
          title: 'What happens next',
          paragraphs: [
            'Instagram prepares the file and emails you when it is ready. That usually takes a few hours, sometimes a day or two, and officially it can take up to 30 days. The download link only works for four days, so download the ZIP as soon as the email arrives. No email? Check your spam folder, or look under Available downloads in Export your information.',
            'Then upload the ZIP to Inbunden without unpacking it. Inbunden reads the posts straight from the file and shows them grouped by month.',
          ],
        },
      ],
      faq: [
        {
          q: 'How long does the Instagram data export take?',
          a: 'Usually a few hours, sometimes a day or two. Instagram says it can take up to 30 days.',
        },
        {
          q: 'How big is the ZIP?',
          a: 'It depends on how much you have posted. With Posts only it is often a few hundred megabytes to a few gigabytes. Inbunden accepts exports up to 8 GB.',
        },
        {
          q: 'Is it safe to upload my export?',
          a: 'Inbunden reads only the posts in the file. Your photos are kept for 3 months so you can make more books, and you can delete them at any time.',
        },
      ],
    },
    guidePrint: {
      title: 'How to print your photo book PDF',
      description:
        'Where and how to print a photo book PDF: what to tell the print shop about size, bleed and colour, and how to choose paper and binding.',
      lead: 'An Inbunden PDF is ready to print as it is: every page is the finished size plus 4 mm of bleed, and the colour is tagged as sRGB. Send it to a print shop or an online photo book printer that accepts PDF files. Tell them the trim size (210 × 210 mm or 210 × 280 mm), that bleed is included, and which paper and binding you want.',
      sections: [
        {
          title: 'What is in the PDF',
          bullets: [
            'One PDF page per book page, in reading order, with the cover as the first page.',
            'Trim size 210 × 210 mm (square) or 210 × 280 mm (portrait), plus 4 mm of bleed on every side. The trim box in the file marks where to cut.',
            'Photos embedded as the original files, never re-compressed. Text stays at least 10 mm inside the trim.',
            'Colour: RGB photos with an sRGB output intent, so the printer converts the colour predictably.',
          ],
        },
        {
          title: 'What to tell the print shop',
          steps: [
            {
              title: 'Trim size and bleed',
              text: '"Finished size 210 × 210 mm (or 210 × 280 mm), 4 mm bleed included, trim box set." Ask them not to scale the pages.',
            },
            {
              title: 'Colour',
              text: '"RGB with an sRGB output intent. Please convert to your printing profile." Most photo printers do this automatically.',
            },
            {
              title: 'Binding',
              text: 'Stapled binding (saddle stitch) works for thin books, usually up to about 48 to 64 pages. Glued binding (perfect binding) suits thicker books. Lay-flat binding lets spreads open fully.',
            },
            {
              title: 'Paper',
              text: 'For photos, coated paper of around 150 to 200 g/m² is a good start. Silk or matte paper shows fewer reflections than gloss.',
            },
            {
              title: 'Cover',
              text: 'The cover is the first page of the PDF. For a hardcover with a printed wrap-around cover, many printers need a separate cover file with a spine. Ask them what they need.',
            },
          ],
        },
        {
          title: 'Print at home or at a shop?',
          paragraphs: [
            'Home printers rarely print to the edge and can’t bind. For a book you will keep, a print shop or an online photo book printer gives a far better result. Printed books from Inbunden, shipped to your door, are coming soon.',
          ],
        },
      ],
      faq: [
        {
          q: 'Can I print the PDF at any print shop?',
          a: 'Yes. The PDF follows the usual print conventions (trim box, bleed, embedded photos, sRGB output intent), so any printer that accepts PDF files can print it.',
        },
        {
          q: 'Why are there white or cut-off edges?',
          a: 'Usually the pages were scaled to fit. Ask the printer to print at 100% and trim at the trim box. The 4 mm of bleed is meant to be cut off.',
        },
        {
          q: 'Will my Instagram photos be sharp in print?',
          a: 'Instagram stores photos at up to 1080 pixels wide. They look good at half or quarter page, but can look soft across a full page. The preview warns you about any photo that would print soft.',
        },
      ],
    },
  },
};
