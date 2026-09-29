/** Privacy policy and terms of use. Keep in step with what the app actually does. */
export const legal = {
  updated: 'Last updated 29 September 2026',
  contact: 'hello@inbunden.com',
  privacy: {
    title: 'Privacy policy',
    lead: 'What Inbunden stores about you, why, for how long, and who else sees it.',
    sections: [
      {
        title: 'Who is responsible',
        paragraphs: [
          'Inbunden is run by Venueve AB in Sweden, which is the data controller for the personal data described here. Write to hello@inbunden.com with any question or request about your data.',
        ],
      },
      {
        title: 'What we store',
        paragraphs: [
          'Your photos: copies of the photos you bring in (from your Instagram export, Instagram login or Google Photos), with the date, caption and like count where the source provides them.',
          'Your books and orders: titles, page layouts, the PDFs you order, prices and payment status.',
          'Your account: your email address and a hashed password (never the password itself), if you create an account. Before that you use Inbunden with an anonymous session.',
          'Access tokens: if you connect Instagram or Google Photos, the access token they give us, stored encrypted. We never see or store your Instagram or Google password.',
          'Technical data: your IP address is used briefly to limit repeated sign-in attempts and is not kept.',
        ],
      },
      {
        title: 'Why, and on what legal basis',
        paragraphs: [
          'To provide the service you ask for — importing photos, building the book, delivering the PDF, sending the emails that belong to it (return link, book ready, password reset, deletion reminder). The legal basis is the contract between you and us (GDPR article 6.1.b).',
          'To keep the service secure and prevent abuse, such as rate limits on sign-in. The legal basis is our legitimate interest (article 6.1.f).',
          'To keep accounting records of paid orders, as Swedish bookkeeping law requires (article 6.1.c).',
          'We do not use your photos or data for advertising, profiling or training anything, and we do not sell them.',
        ],
      },
      {
        title: 'How long we keep it',
        paragraphs: [
          'Photos are kept for 3 months after an import, and each new book extends that by 3 months. We email you a week before they are deleted. You can delete them yourself at any time under My books.',
          'Ordered PDFs stay available in your account until you ask us to delete them, so you can download your book again.',
          'An anonymous session that is not used for 30 days, and never led to an order, is deleted with everything in it.',
          'Instagram access ends after 60 days at the latest, or when you disconnect. Google Photos access ends within an hour.',
          'Accounting records of paid orders are kept for the 7 years Swedish law requires.',
        ],
      },
      {
        title: 'Who else processes your data',
        paragraphs: [
          'Microsoft Azure hosts the site, the database and the photo storage, in Microsoft’s West Europe region (the Netherlands).',
          'Resend delivers our emails; it receives your email address and the email content.',
          'Stripe handles card payments when card payments are active. Card details go directly to Stripe and never reach us.',
          'Google receives your sign-in when you use Google Photos import, and shares only the photos you pick. Instagram (Meta) is involved only if you connect it or use its export.',
          'The site loads its fonts from Google Fonts, which means your browser contacts Google’s servers and Google sees your IP address.',
          'Some of these providers are based in the United States. Transfers are covered by the EU–US Data Privacy Framework or the EU standard contractual clauses.',
        ],
      },
      {
        title: 'Cookies and browser storage',
        paragraphs: [
          'Inbunden sets one cookie, pg_session, which keeps you signed in for up to 30 days. It is strictly necessary for the service, so we do not ask for consent. There are no analytics or advertising cookies.',
          'Your browser also stores your language choice and the book you are working on (local storage), so they survive a page reload. They never leave your device unless you save the book.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'You can ask for a copy of your data, have it corrected, have it deleted, restrict or object to its processing, and receive it in a portable format. Write to hello@inbunden.com; we answer within a month. To delete your account and everything in it, just ask — photos you can delete yourself right away under My books.',
          'If you think we handle your data wrongly, you can complain to the Swedish Authority for Privacy Protection (IMY, imy.se).',
        ],
      },
      {
        title: 'Changes',
        paragraphs: [
          'If this policy changes in a way that matters, we will say so on the site and, if you have an account, by email.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    lead: 'The agreement between you and Inbunden when you use the site or buy a book.',
    sections: [
      {
        title: 'The service',
        paragraphs: [
          'Inbunden turns photos you choose into a photo book. You bring the photos in, pick the ones you want and arrange the pages; we produce a print-ready PDF of the book. Printed books are not sold yet.',
          'Inbunden is run by Venueve AB in Sweden (hello@inbunden.com). These terms apply to everyone who uses the site; by using it you accept them.',
        ],
      },
      {
        title: 'Your account',
        paragraphs: [
          'You can start without an account. To buy a book you need an email address and a password. Keep your password to yourself; you are responsible for what is done with your account.',
        ],
      },
      {
        title: 'Your photos',
        paragraphs: [
          'Your photos stay yours. You give us permission to store, process and lay out the photos you bring in, only to provide the service to you, and for as long as described in the privacy policy.',
          'You may only use photos you have the right to use. Do not upload content that is illegal, or that infringes someone else’s copyright, privacy or other rights. We may remove such content and close the account.',
        ],
      },
      {
        title: 'Prices and payment',
        paragraphs: [
          'The price is shown before you pay and includes VAT where it applies. Payment is taken when you confirm the order. While the site shows “Test mode”, no real payment is taken.',
        ],
      },
      {
        title: 'Delivery and right of withdrawal',
        paragraphs: [
          'The PDF is digital content that is delivered right after payment. Under the Swedish Distance Contracts Act (2005:59) you have a 14-day right of withdrawal for purchases online, but it does not apply to digital content once delivery has started with your consent and your acknowledgement that the right of withdrawal is lost.',
          'If the PDF cannot be produced or has a fault that is our doing, we fix it or refund you in full. Write to hello@inbunden.com.',
        ],
      },
      {
        title: 'Availability and liability',
        paragraphs: [
          'We work to keep Inbunden available and your photos safe, but cannot promise the service will always be uninterrupted. Keep your original photos: Inbunden is not a backup service, and photo copies are deleted as described in the privacy policy.',
          'Our liability is limited to the amount you paid for the order in question, except where the law does not allow such a limit, for example for gross negligence. Nothing in these terms limits your rights as a consumer under Swedish law.',
        ],
      },
      {
        title: 'Other services',
        paragraphs: [
          'When you connect Instagram or Google Photos, their own terms apply to your use of them. Inbunden is not affiliated with, endorsed or sponsored by Instagram, Meta or Google.',
        ],
      },
      {
        title: 'Changes and disputes',
        paragraphs: [
          'We may update these terms; the version shown when you place an order applies to that order. Swedish law applies. If we cannot agree, you can turn to the National Board for Consumer Disputes (ARN, arn.se) or a Swedish court.',
        ],
      },
    ],
  },
};
