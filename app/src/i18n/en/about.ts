/** About page: the name, what the service does, how photos are handled, who is behind it. */
export const about = {
  title: 'About Inbunden',
  /** `{price}` is the PDF price from the config, as on the landing page. */
  lead: 'Inbunden is a web service from Sweden that turns your Instagram posts into a photo book. You pick the photos, we lay out the pages and you download a print‑ready PDF for {price}.',
  sections: [
    {
      title: 'The name',
      paragraphs: [
        'Inbunden is the Swedish word for a hardcover book. Taken apart it reads "in-bound": bound in, held between two covers.',
        'Swedes use the same word for someone who keeps things to themselves. We like that too. Your photos, bound in, and kept private.',
      ],
    },
    {
      title: 'What Inbunden does',
      paragraphs: [
        'You pick the posts (a year, a trip, a first year) and Inbunden lays out the pages. You get a print-ready PDF in minutes, to print wherever you like or keep as it is. Printed books are on the way.',
        'New to this? Start with [how to make a photo book from your Instagram](guideInstagramBook), or see [how Inbunden compares](guideCompare) with other photo book services.',
      ],
    },
    {
      title: 'How your photos are handled',
      paragraphs: [
        'We never ask for your Instagram or Google password. You bring photos in with the export Instagram sends you, or through Google Photos’ own picker. Either way we can only read the photos, never change anything.',
        'We keep copies of your photos for 3 months so you can make more books without importing again. Each new book adds 3 more months. You can delete them yourself any time. Otherwise we delete them when the time is up, and email you a week before. Ordered PDFs stay downloadable either way.',
      ],
    },
    {
      title: 'Who is behind it',
      paragraphs: [
        'Inbunden is made in Sweden by Venueve AB. It is small on purpose: one price, no subscriptions, no ads, and no selling of anything you upload.',
      ],
    },
  ],
  factsTitle: 'In short',
  facts: [
    { label: 'What', value: 'Photo books from Instagram and Google Photos, as a print‑ready PDF' },
    { label: 'Company', value: 'Venueve AB, Sweden' },
    { label: 'Price', value: '{price} per book, whatever the number of pages. No subscription.' },
    { label: 'Languages', value: 'English and Swedish' },
    { label: 'Photos kept', value: '3 months, then deleted after a reminder' },
    { label: 'Contact', value: 'hello@inbunden.com' },
  ],
  contactTitle: 'Contact',
  contactText: 'Questions, ideas or something that went wrong? Write to',
  contactEmail: 'hello@inbunden.com',
  start: 'Start your book',
  updated: (date: string) => `Updated ${date}`,
};
