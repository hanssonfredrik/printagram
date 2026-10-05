import type { GuideKey } from '@/seo/routes';
import type { Faq, Feature } from '@/seo/text';

/**
 * Guide pages (/guides/...): long-form how-tos. Facts must match the product. Text may contain
 * `[text](pageKey)` links to other public pages.
 */

export interface GuideSection {
  title: string;
  paragraphs?: string[];
  /** Numbered steps. */
  steps?: { title: string; text: string }[];
  /** A bullet with `when` only shows while that feature flag is on (or off). */
  bullets?: (string | { text: string; when: Feature })[];
  /** A comparison table: the first column is the row label. */
  table?: { caption: string; head: string[]; rows: string[][]; note?: string };
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
  faq: Faq[];
}

export interface GuidesMessages {
  index: { title: string; lead: string; read: string; updated: (date: string) => string };
  breadcrumb: string;
  breadcrumbLabel: string;
  updated: (date: string) => string;
  faqTitle: string;
  related: string;
  cta: { title: string; text: string; button: string };
  items: Record<GuideKey, Guide>;
}

export const guides: GuidesMessages = {
  index: {
    title: 'Photo book guides',
    lead: 'How to turn your Instagram into a photo book, from getting the photos out of Instagram to holding the printed book.',
    read: 'Read the guide',
    updated: (date) => `Updated ${date}`,
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
            'Data export: ask Instagram for a copy of your posts and upload the ZIP it emails you. It works for every account, private ones included. Instagram needs a few hours to a couple of days to prepare it. [How to download your Instagram data](guideInstagramExport) shows every step.',
            {
              text: 'Google Photos: ask Instagram to send a copy of your posts to Google Photos, then pick them in Google’s own picker. Captions and likes stay behind that way.',
              when: 'googlePhotos',
            },
            {
              text: 'Connecting your Instagram account directly is coming soon. We’re waiting for Instagram to approve Inbunden.',
              when: 'noConnect',
            },
            {
              text: 'Connect Instagram: sign in on Instagram’s own page and your posts show up straight away. This needs a Creator or Business account.',
              when: 'connect',
            },
          ],
        },
        {
          title: 'Step 2: Choose the posts',
          paragraphs: [
            'A book works best with a theme: [a year](guideYearBook), a trip, a child’s first year. Inbunden groups your posts by month and year, so you can tick whole periods at once or pick single photos. Carousel posts come with every photo in them.',
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
            'Take the PDF to any print shop or online photo book printer that accepts PDF files. The guide to [printing your photo book](guidePrint) lists the settings to ask for. Printed books from Inbunden are coming soon.',
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
            'Wrong format, no posts or a link that has expired? See [Instagram export problems and how to fix them](guideExportProblems).',
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
            'Home printers rarely print to the edge and can’t bind. For a book you will keep, a print shop or an online photo book printer gives a far better result. Printed books from Inbunden are coming soon.',
            'Want loose prints instead of a book? See [how to print your Instagram photos](guidePrintPhotos). Not sure which service to use? See [photo book services compared](guideCompare).',
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
    guideExportProblems: {
      title: 'Instagram export problems and how to fix them',
      description:
        'The Instagram data export came as HTML, has no posts, will not open or is too big? What each problem means and how to fix it in a few minutes.',
      lead: 'Most problems with the Instagram data export come from three settings: the format must be JSON, Posts must be ticked, and the ZIP must be downloaded within four days. If one of them was wrong, request a new export with the right settings. It only takes a couple of minutes to ask for.',
      sections: [
        {
          title: 'The export is in HTML format',
          paragraphs: [
            'Instagram offers two formats: HTML for reading in a browser and JSON for software. Inbunden needs JSON to read the dates, captions and the order of carousel photos. Request the export again and set Format to JSON. The steps are in [how to download your Instagram data](guideInstagramExport).',
          ],
        },
        {
          title: 'There are no posts in the export',
          paragraphs: [
            'The ZIP opened, but nothing was in it. That happens when Posts was not ticked. Under Customize information, untick everything and tick Posts under Your Instagram activity. Some versions of the app call it Media. Also check that you picked your Instagram profile and not only a Facebook account.',
          ],
        },
        {
          title: 'The file will not open',
          paragraphs: [
            'The download was probably cut short, or the link had already expired. The link in Instagram’s email works for four days. Download the ZIP again from the email, or from Available downloads under Export your information. If the link has expired, request a new export.',
          ],
        },
        {
          title: 'The export comes in several parts',
          paragraphs: [
            'Large accounts get the export split into several ZIP files. Download all of them and drop them on the upload page at the same time. Inbunden reads them as one export. Don’t unpack them first.',
          ],
        },
        {
          title: 'The file is too large',
          paragraphs: [
            'Inbunden takes exports up to 8 GB. If yours is bigger, request it again with a custom date range, for example one year at a time, or with a lower media quality. Choosing Posts only, instead of all your information, also makes the file much smaller.',
          ],
        },
        {
          title: 'The email never arrived',
          bullets: [
            'Check your spam folder and the email address Instagram showed when you started the export.',
            'Look under Available downloads in Export your information. The file appears there when it is ready.',
            'Wait a little longer. It usually takes a few hours, sometimes a day or two, and Instagram says it can take up to 30 days.',
          ],
        },
        {
          title: 'Some photos were skipped',
          paragraphs: [
            'Instagram exports normally contain JPEG and WebP files. If a photo uses another format, Inbunden skips that one photo and imports the rest. Videos and Reels are always left out, because a book is printed.',
          ],
        },
      ],
      faq: [
        {
          q: 'Should I choose HTML or JSON for the Instagram export?',
          a: 'JSON. It keeps the dates, captions and carousel order in a form software can read. HTML is only for looking at in a browser.',
        },
        {
          q: 'How long is the Instagram download link valid?',
          a: 'Four days. After that, request a new export.',
        },
        {
          q: 'Do I need to unzip the export before uploading it?',
          a: 'No. Upload the ZIP as it is. If there are several parts, drop them all at once.',
        },
      ],
    },
    guidePrintPhotos: {
      title: 'How to print your Instagram photos',
      description:
        'Print your Instagram photos as loose prints or as a book: how to get the photos out, what size they print well at, and where to print them.',
      lead: 'To print your Instagram photos, first download them with Instagram’s data export. Instagram keeps photos at up to 1080 pixels wide, which prints sharply up to about 10 × 10 cm and looks fine up to about 13 × 13 cm. For more than a handful of photos, a photo book is easier to keep than a pile of prints.',
      sections: [
        {
          title: 'Step 1: Get the photos out of Instagram',
          paragraphs: [
            'Instagram has no print button. The reliable way to get all your photos is the data export: Instagram emails you a ZIP with every photo you have posted. [How to download your Instagram data](guideInstagramExport) shows each step.',
            'If you still have the original photos on your phone or camera, use those for big prints. They usually have far more pixels than the copies Instagram keeps.',
          ],
        },
        {
          title: 'Step 2: Pick a size that suits the pixels',
          paragraphs: [
            'A print looks sharp at around 300 pixels per inch and acceptable at around 200. A 1080 pixel wide Instagram photo gives you:',
          ],
          bullets: [
            'about 9 cm wide at 300 pixels per inch: sharp',
            'about 10 to 13 cm wide: still good for most photos',
            'larger than about 14 cm: may look soft, especially close up',
          ],
        },
        {
          title: 'Step 3: Choose loose prints or a book',
          paragraphs: [
            'Square prints of 10 × 10 cm suit Instagram’s square posts and fit most frames and albums. Order them from a photo lab, an online print service or a kiosk in a shop. Portrait posts need cropping, or a white border, to fit the usual print sizes.',
            'For a year of posts, a trip or a child’s first year, a photo book keeps everything in order with dates and captions. Inbunden lays out a book from your export and gives you a print-ready PDF you can [print at any print shop](guidePrint). With one to four photos per page, each photo stays at a size where it looks sharp.',
          ],
        },
      ],
      faq: [
        {
          q: 'What size can I print an Instagram photo at?',
          a: 'Instagram keeps photos at up to 1080 pixels wide. That prints sharply at about 9 to 10 cm and looks fine up to about 13 cm.',
        },
        {
          q: 'Can I print photos from someone else’s Instagram?',
          a: 'Only with their permission, and they need to send you the photos. The data export only works for your own account.',
        },
        {
          q: 'Does Inbunden print loose photos?',
          a: 'No. Inbunden makes photo books as a print-ready PDF. You can print the PDF at any print shop.',
        },
      ],
    },
    guideYearBook: {
      title: 'How to make a yearly photo book from your Instagram',
      description:
        'Make a photo book of your year from your Instagram posts: when to start, how to choose the photos, and how to make it a yearly tradition.',
      lead: 'A yearly photo book collects the year’s Instagram posts in one book. Request your Instagram data export, tick the year in Inbunden and download the book as a print-ready PDF. The PDF costs the same however many pages the year fills, so a busy year costs no more than a quiet one.',
      sections: [
        {
          title: 'Step 1: Request the export early',
          paragraphs: [
            'Instagram needs a few hours, sometimes a day or two, to prepare the export. Ask for it in early January, or a week before you want the book. Choose All time and JSON, then pick the year in Inbunden. [How to download your Instagram data](guideInstagramExport) shows every step.',
          ],
        },
        {
          title: 'Step 2: Tick the year and trim it',
          paragraphs: [
            'Inbunden groups your posts by month, so you can tick all twelve months in a few clicks. Then untick the photos that don’t belong: duplicates, screenshots, things you posted for someone else.',
            'A book holds up to 999 photos. As a guide, with one to four photos per page, 100 photos make roughly 35 to 50 pages and 300 photos roughly 100 to 150.',
          ],
        },
        {
          title: 'Step 3: Give each month a start',
          bullets: [
            'Add a text page for each month or season, with the name and a few words.',
            'Use a full-bleed page for the best photo of each month.',
            'Turn on dates under the photos so the book reads like a diary.',
            'Put a photo from December, or the whole year’s best, on the cover and set the title, for example "2026".',
          ],
        },
        {
          title: 'Step 4: Make it a tradition',
          paragraphs: [
            'Keep the same format every year, square 21 × 21 cm or portrait 21 × 28 cm, so the books look good together on a shelf. Inbunden keeps your photos for 3 months, and every new book adds 3 more, so you can make a book for each family member, or a second copy, without importing again.',
            'When the book is ready, [print the PDF](guidePrint) wherever you like. Many families make the yearly book a [Christmas gift](guideGift) for grandparents.',
          ],
        },
      ],
      faq: [
        {
          q: 'How many photos fit in a yearly photo book?',
          a: 'Up to 999 photos in one book. With one to four photos per page, 200 photos make roughly 70 to 100 pages.',
        },
        {
          q: 'Does a thicker book cost more?',
          a: 'Not the PDF. It has one price whatever the number of pages. Printing it costs more the more pages it has.',
        },
        {
          q: 'Can I make the book before the year is over?',
          a: 'Yes. Make one for the first half of the year in summer, and one for the second half in January.',
        },
      ],
    },
    guideGift: {
      title: 'A photo book from Instagram as a gift',
      description:
        'Make a photo book from your Instagram as a gift for grandparents, a partner or a friend: ideas, how long it takes, and how to give it on time.',
      lead: 'A photo book made from your Instagram is an easy personal gift: the photos are already chosen and dated. Plan for a few days in total. Instagram needs a few hours to a day or two for the export, making the book takes under an hour, and printing depends on the print shop.',
      sections: [
        {
          title: 'Ideas that work well',
          bullets: [
            'The family’s year for grandparents, with dates under the photos.',
            'Your year together for a partner, with a text page for each season.',
            'A child’s first year, month by month.',
            'One trip or one summer, as a thin book with large photos.',
            'A friend’s birthday book from the posts you have shared over the years.',
          ],
        },
        {
          title: 'How long it takes',
          steps: [
            {
              title: 'Request the Instagram export',
              text: 'About two minutes, then Instagram needs a few hours, sometimes a day or two. See [how to download your Instagram data](guideInstagramExport).',
            },
            {
              title: 'Make the book',
              text: 'Pick the photos, adjust the layout and add a text page with a dedication. Usually under an hour.',
            },
            {
              title: 'Print it',
              text: 'A local print shop can often print in a few days. Online photo book printers usually need a week or more, so check their delivery times before the holidays. The [printing guide](guidePrint) lists what to ask for.',
            },
          ],
        },
        {
          title: 'Short on time?',
          paragraphs: [
            'The PDF is ready to download straight after you pay. You can give it as a file, or print a single page as a card and hand over the book later.',
          ],
        },
        {
          title: 'Whose photos can you use?',
          paragraphs: [
            'The Instagram data export only works for your own account. To make a book of someone else’s posts, they need to request the export and send you the ZIP, which spoils the surprise. A book of your own photos of them works just as well.',
          ],
        },
      ],
      faq: [
        {
          q: 'How long does it take to make a photo book from Instagram?',
          a: 'Plan for a few days: the Instagram export takes a few hours to a day or two, making the book under an hour, and printing depends on the print shop.',
        },
        {
          q: 'Can I add a dedication?',
          a: 'Yes. Add a text page anywhere in the book, for example right after the cover.',
        },
        {
          q: 'Can I give the PDF without printing it?',
          a: 'Yes. The PDF is yours to share or print, and it stays downloadable from your Inbunden account.',
        },
      ],
    },
    guideCompare: {
      title: 'Photo book services for Instagram photos compared',
      description:
        'Inbunden, MySocialBook, Chatbooks, ifolor, CEWE, Smartphoto and Fotoklok compared for Instagram photo books: import, starting price and what you get.',
      lead: 'Few photo book services still import straight from Instagram. Since Meta closed the Instagram Basic Display API, most of them ask you to upload the photos yourself. MySocialBook connects to Instagram Creator and Business accounts. Inbunden reads Instagram’s own data export from any account and gives you a print-ready PDF, while ifolor, CEWE, Smartphoto and Fotoklok print a book you make in their editor.',
      sections: [
        {
          title: 'Two kinds of service',
          paragraphs: [
            'Most photo book services sell a printed book. You upload photos, arrange them in their editor and they print and ship the book. That suits you if you want a finished book delivered and are happy to place the photos yourself.',
            'Inbunden starts from your Instagram posts instead. It reads the export Instagram gives you, lays out the pages in date order with your captions, and sells the result as a print-ready PDF. You decide where to print it. Printed books from Inbunden are coming soon.',
          ],
        },
        {
          title: 'At a glance',
          table: {
            caption: 'Photo book services for Instagram photos, checked 5 October 2026',
            head: ['Service', 'Getting Instagram photos in', 'Cheapest book', 'What you get'],
            rows: [
              [
                'Inbunden',
                'Upload Instagram’s data export (any account, private ones too)',
                '€9 / 89 kr for the PDF, any number of pages',
                'Print-ready PDF, laid out from your posts',
              ],
              [
                'MySocialBook',
                'Connects to Instagram (Creator or Business accounts only)',
                'From $33, softcover with 25 pages',
                'Printed book, PDF as an add-on',
              ],
              [
                'Chatbooks',
                'No Instagram import any more. Camera roll or Google Photos',
                'Not checked',
                'Printed book, ships to Sweden',
              ],
              [
                'ifolor',
                'Upload from phone or computer, or their app',
                'From 99 kr, 13 × 13 cm softcover with 20 pages',
                'Printed book, optional e-book (ePub)',
              ],
              [
                'CEWE',
                'Upload, app or desktop software; Google Photos supported',
                'From 99 kr, compact book of about 15 × 15 cm',
                'Printed book',
              ],
              [
                'Smartphoto',
                'Upload from phone or computer',
                'From 109 kr (Mini)',
                'Printed book, printed in Belgium',
              ],
              [
                'Fotoklok',
                'Upload, app or desktop software',
                'From 199 kr, softcover',
                'Printed book, printed in Sweden; also prints your own PDF',
              ],
            ],
            note: 'Prices are the regular starting prices on each service’s Swedish or main site on 5 October 2026, without campaign codes, and change often. Check the service before you order.',
          },
        },
        {
          title: 'When Inbunden suits you',
          bullets: [
            'Your photos are on Instagram and you want them in date order, with captions, without placing every photo by hand.',
            'Your account is private or personal, so direct Instagram connections don’t work.',
            'You want a file you own and can print anywhere, more than once.',
            'You have a lot of photos. The PDF costs the same at 30 pages or 300.',
          ],
        },
        {
          title: 'When another service suits you better',
          bullets: [
            'You want a printed book delivered and don’t want to deal with a print shop. Inbunden doesn’t print books yet.',
            'Your best photos are on your phone or camera, not on Instagram. Original files print sharper than Instagram’s copies.',
            'You want a very small book or special formats, like a 13 × 13 cm gift book.',
          ],
        },
        {
          title: 'Printing an Inbunden PDF',
          paragraphs: [
            'The PDF works at any print shop or online printer that accepts PDF files. Fotoklok in Sweden prints books from your own PDF (at least 3 copies at the time of writing). ifolor says it can’t accept PDF files in its orders. The [printing guide](guidePrint) lists what to ask for.',
          ],
        },
      ],
      faq: [
        {
          q: 'Which photo book services can import directly from Instagram?',
          a: 'Of the services we checked on 5 October 2026, only MySocialBook connects to Instagram, and only for Creator and Business accounts. Chatbooks stopped after Meta closed the Instagram Basic Display API. Inbunden uses Instagram’s data export, which works for every account.',
        },
        {
          q: 'What is the cheapest way to make a photo book from Instagram?',
          a: 'The cheapest printed books start at around 99 kr for a small softcover. Inbunden’s PDF costs €9 / 89 kr whatever the number of pages, and you pay the print shop of your choice for printing.',
        },
        {
          q: 'Can I get a PDF of my photo book?',
          a: 'Inbunden sells the book as a PDF. MySocialBook offers a PDF as an add-on. ifolor offers an e-book in ePub format. We found no PDF option at the other services we checked.',
        },
      ],
    },
  },
};
