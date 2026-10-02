/** Privacy policy and terms of use. Keep in step with what the app actually does. */
export const legal = {
  updated: 'Last updated 2 October 2026',
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
          'Visit statistics: when a page opens we count the page address, the website you came from, the type of device (phone, tablet or computer) and the language. To count unique visitors without a cookie, your IP address and browser are combined with a random value that changes every day and turned into a one-way code; the IP address itself is never stored, and the code cannot be traced back to you or linked across days. Nothing is counted if your browser sends Do Not Track or Global Privacy Control.',
          'Google Analytics, only if you accept it in the cookie banner: which pages you view, how you arrived, your device, browser and approximate location (country or city, which Google derives from your IP address), and a random identifier stored in a cookie. We use it to understand how the site is used, never for advertising: ad features are switched off.',
        ],
      },
      {
        title: 'Why, and on what legal basis',
        paragraphs: [
          'To provide the service you ask for - importing photos, building the book, delivering the PDF, sending the emails that belong to it (return link, book ready, password reset, deletion reminder). The legal basis is the contract between you and us (GDPR article 6.1.b).',
          'To keep the service secure and prevent abuse, such as rate limits on sign-in. The legal basis is our legitimate interest (article 6.1.f).',
          'To understand how many people visit the site and which pages they use, through the anonymous visit statistics above. The legal basis is our legitimate interest (article 6.1.f).',
          'Google Analytics is used only with your consent (article 6.1.a). You can withdraw it at any time under Cookie settings at the bottom of every page; nothing is sent to Google before you accept.',
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
          'Visit statistics are deleted after 90 days.',
          'Google Analytics data is kept by Google for 14 months. Its cookies expire after at most 2 years, or are removed as soon as you withdraw your consent.',
        ],
      },
      {
        title: 'Who else processes your data',
        paragraphs: [
          'Microsoft Azure hosts the site, the database and the photo storage, in Microsoft’s West Europe region (the Netherlands).',
          'Resend delivers our emails; it receives your email address and the email content.',
          'Google (Google Ireland Limited) runs Google Analytics for us as our processor, if you accept it.',
          'Stripe handles card payments when card payments are active. Card details go directly to Stripe and never reach us.',
          'Google receives your sign-in when you use Google Photos import, and shares only the photos you pick. Instagram (Meta) is involved only if you connect it or use its export.',
          'The site loads its fonts from Google Fonts, which means your browser contacts Google’s servers and Google sees your IP address.',
          'Some of these providers are based in the United States. Transfers are covered by the EU–US Data Privacy Framework or the EU standard contractual clauses.',
        ],
      },
      {
        title: 'How we protect your data',
        paragraphs: [
          'In transit: all traffic to and from Inbunden, and between Inbunden and the services it uses, is encrypted with HTTPS (TLS 1.2 or newer).',
          'At rest: your photos, books and our database are stored encrypted by Microsoft Azure in the EU. The storage is never publicly readable. Your photos are kept in private storage containers of their own, and your photos can only be opened through short-lived signed links issued to your own session.',
          'Access tokens: the tokens Google and Instagram give us are encrypted with AES-256-GCM before they are stored, with a key kept separately from the data. The Google token is read-only, covers only the photos you pick, is never refreshed and expires within an hour. Disconnecting revokes it at Google right away.',
          'Passwords and sessions: passwords are stored only as a salted scrypt hash. Your session is a signed cookie that scripts on the page cannot read (HttpOnly) and that is only sent over HTTPS.',
          'Access control: only Inbunden’s own service can read your photos and tokens. Nobody at Venueve AB looks at your photos unless you ask us to help with a specific book. Our own administration tool is a separate site that requires two-factor sign-in, and every action in it is logged. Repeated sign-in attempts are rate-limited.',
          'If a personal data breach happens anyway, we report it to the Swedish Authority for Privacy Protection within 72 hours and tell the people affected, as the GDPR requires.',
        ],
      },
      {
        title: 'Data from Google',
        paragraphs: [
          'When you import from Google Photos, Inbunden receives only the photos you select in Google’s own picker, and only to copy them into your book. We cannot see the rest of your library, your albums or your Google profile.',
          'We do not share data received from Google with anyone except the processors listed above that run the service, and we never use it for advertising, profiling or training AI or machine learning models.',
          'Inbunden’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.',
        ],
      },
      {
        title: 'Cookies and browser storage',
        paragraphs: [
          'Inbunden sets one cookie, pg_session, which keeps you signed in for up to 30 days. It is strictly necessary for the service, so we do not ask for consent. The visit statistics described above work without any cookie or browser storage.',
          'If you accept Google Analytics in the cookie banner, Google sets the cookies _ga and _ga_JJQ0ZS1MSP (up to 2 years). Nothing is set before you accept, declining is as easy as accepting, and you can change your choice under Cookie settings at the bottom of every page. There are no advertising cookies.',
          'Your browser also stores your language choice, your cookie choice and the book you are working on (local storage), so they survive a page reload. They never leave your device unless you save the book.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'You can ask for a copy of your data, have it corrected, have it deleted, restrict or object to its processing, and receive it in a portable format. Write to hello@inbunden.com; we answer within a month. To delete your account and everything in it, just ask - photos you can delete yourself right away under My books.',
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
