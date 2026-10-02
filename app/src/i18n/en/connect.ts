/** Connect Instagram: account check, switch guide, OAuth wait, import and result. */
export const connect = {
  title: 'Connect your Instagram',
  intro:
    "You'll log in on instagram.com and allow Inbunden to read your posts. Instagram only lets Creator and Business accounts connect, so first a quick check.",
  acctQuestion: 'What kind of account do you have?',
  acct: {
    pro: 'Creator or Business',
    personal: 'Personal',
    unsure: 'Not sure',
  },
  askFor: {
    title: 'What Inbunden will ask for',
    profile: 'Your username and profile picture',
    posts: 'Your posts - photos, captions, dates and likes',
    readOnly:
      'Read‑only. No posting, no messages, no followers. Disconnect anytime - access also ends by itself after 60 days.',
  },
  continue: 'Continue with Instagram',
  opensWindow:
    'Opens instagram.com in a new window. You log in there - we never see your password.',
  switchFirst: {
    title: 'Switch to a Professional account first',
    text: 'Free, about two minutes, reversible, and nobody is notified. One thing changes: a private account becomes public, and pending follow requests are accepted. Prefer to stay private? Use the export instead - it works for every account.',
  },
  switchSteps: [
    {
      title: 'Open Settings and activity',
      text: 'In the Instagram app, go to your profile, tap the menu (☰) top right, then Settings and activity.',
    },
    {
      title: 'Account type and tools',
      text: 'Scroll down to For professionals and tap Account type and tools.',
    },
    {
      title: 'Switch to professional account',
      text: 'Tap Switch to professional account and continue through the intro screens.',
    },
    {
      title: 'Pick a category',
      text: 'Choose whatever fits - Photographer, Blogger, Personal blog. You can hide it from your profile.',
    },
    {
      title: 'Choose Creator',
      text: "Creator is the simplest fit for a personal profile; Business works too. Skip the contact details and the Facebook link if you're asked.",
    },
  ],
  goodToKnow: {
    title: 'Good to know',
    text: 'On a computer the same setting is at instagram.com → More → Settings → Account type and tools. Just switched? Instagram can take a few minutes to register the change. Switch back anytime under Account type and tools → Switch to personal account.',
  },
  switched: "I've switched - continue with Instagram",
  keepAccount: 'Keep my account as it is - use the export',
  quickCheck: {
    title: 'A quick way to check',
    text: "Open your own profile in the Instagram app. If there's a Professional dashboard button under your bio, you have a Creator or Business account. If there isn't, it's personal.",
  },
  seeButton: "I see the button - it's Professional",
  noButton: "No button - it's personal",
  waiting: {
    title: 'Waiting for Instagram…',
    text: 'A window opened at instagram.com. Log in there and tap Allow. This page updates by itself.',
    reopen: 'Nothing opened? Open Instagram again',
  },
  errors: {
    personal: {
      title: "Instagram didn't let us connect",
      text: 'Instagram only connects Creator and Business accounts, and it shows a vague error when an account is personal. If you switched just now, give Instagram a few minutes and try again.',
    },
    denied: {
      title: 'No access was granted',
      text: "The Instagram window was closed or you tapped Cancel, so nothing was shared with Inbunden. Try again whenever you're ready, or use the export instead.",
    },
    expired: {
      title: 'The connection timed out',
      text: 'Instagram did not answer in time. Try again, or use the export instead.',
    },
    unknown: {
      title: 'Something went wrong on Instagram',
      text: 'Instagram returned an error we did not expect. Try again in a minute, or use the export instead.',
    },
  },
  showSwitch: 'Show me how to switch',
  tryAgain: 'Try again',
  useExport: 'Use the export instead',
  importing: {
    account: 'Creator account · connected just now',
    connected: 'Connected',
    copying: 'Copying your posts…',
    note: "We copy your photos once, at full size. Instagram's links expire, so we keep the copies until your book is done - then they're deleted.",
  },
  found: (n: number) => `Found ${n} photos`,
  foundFrom: (n: number, years: string) => `Found ${n} photos from ${years}`,
  foundStats: (posts: number, carousels: number, videos: number) =>
    `${posts} posts · ${carousels} carousels · ${videos} videos skipped by default · likes included`,
  backToBooks: 'Back to My books',
  choosePhotos: 'Choose photos',
  readUntil: 'Inbunden can read your posts until you disconnect, or automatically after 60 days.',
  disconnectNow: 'Disconnect now',
  disconnected:
    "Disconnected. Your copied photos stay until your book is done, then they're deleted.",
  storage:
    'Your photos are stored only to build your books, kept for 3 months, and deletable by you at any time. Instagram never shares your password with us.',
  libraryReady: (id: string) => `Library ${id} ready`,
};
