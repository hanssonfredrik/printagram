/** Choose source: connect Instagram or upload the export. */
export const choose = {
  title: 'Bring in your photos',
  adding: (n: number) =>
    `Adding to your library. Only posts newer than your last import are added - the ${n} photos you already have stay as they are.`,
  intro:
    'A few ways to get your posts into Inbunden. All of them are read‑only, and none shares your password with us.',
  instant: 'Instant',
  comingSoon: 'Coming soon',
  connect: {
    title: 'Connect Instagram',
    text: "Log in on Instagram's own site and allow Inbunden to read your posts. Your photos show up here right away.",
    needsPro:
      'Needs a Creator or Business account. Switching is free, takes two minutes and is reversible.',
    likes: 'Brings your likes along, so you can print your most‑loved posts.',
    public: 'Professional accounts are public. Want to stay private? Use the export.',
    button: 'Connect Instagram',
    waiting:
      "We're waiting for Instagram to approve Inbunden. Until then, use the export - it works for every account.",
  },
  export: {
    pill: 'Works for every account',
    title: 'Upload your export',
    text: 'Ask Instagram for a copy of your posts, then drop the ZIP here. Nothing about your account changes.',
    every: 'Personal, private, Creator or Business - every account works.',
    email:
      'Instagram emails you the file - a few hours, sometimes a day or two. We send you a return link.',
    noLikes: "Likes usually aren't included in the export.",
    button: 'Show me how',
  },
  google: {
    pill: 'Works for every account',
    title: 'Via Google Photos',
    text: 'Let Instagram send your posts to Google Photos, then pick them there. Nothing to download - handy on a phone.',
    every: 'Personal, private, Creator or Business - every account works.',
    background: 'Instagram copies the photos in the background; you pick them once they are there.',
    noCaptions: 'Captions and likes stay behind, and dates may be the transfer date.',
    button: 'Send via Google Photos',
  },
  unsure: {
    title: 'Not sure which account you have?',
    before: 'Open your own profile in the Instagram app. A ',
    button: 'Professional dashboard',
    after: ' button under your bio means Creator or Business. No button means personal.',
  },
};
