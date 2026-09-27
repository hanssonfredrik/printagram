/** Google Photos path: Instagram transfers the posts there, the user picks them, we copy. */
export const google = {
  title: 'Bring in photos via Google Photos',
  intro:
    'Instagram can send a copy of your posts straight to Google Photos — for every account, private ones too. Then you pick the photos in Google Photos and we copy them. No ZIP to download.',
  ask: {
    question: 'Have you already sent your Instagram photos to Google Photos?',
    hint: 'This is done inside Instagram, not here. It takes two minutes to start, and Instagram does the copying in the background.',
    yes: "Yes, they're in Google Photos",
    no: 'Not yet — show me how',
  },
  howTo: 'How to send your posts to Google Photos',
  started: "I've started the transfer — continue",
  ready: {
    title: 'Next: sign in with Google',
    text: 'Sign in once the photos have arrived in Google Photos (look for the Data Transfer album). Started the transfer just now? Come back later — nothing is lost, and the steps are in your inbox if you emailed them.',
    back: 'Show the Instagram steps again',
  },
  steps: [
    {
      title: 'Open Accounts Center',
      text: 'In the Instagram app: profile → menu (☰) → Settings and activity → Accounts Center → Your information and permissions.',
    },
    {
      title: 'Transfer a copy of your information',
      text: 'Tap Transfer a copy of your information (older versions: Download or transfer information → Transfer to a destination). Pick your Instagram profile.',
    },
    {
      title: 'Choose Google Photos',
      text: 'Choose Posts (all of them, or a date range), then Google Photos as the destination. Sign in to Google when asked and allow the transfer.',
    },
    {
      title: 'Wait for Instagram',
      text: 'Instagram copies your photos in the background — usually within an hour, sometimes longer. Google Photos shows them in a folder or album called Data Transfer.',
    },
  ],
  goodToKnow: {
    title: 'Good to know',
    text: 'Only the photos make the trip: captions and likes stay on Instagram. Dates are what Google Photos knows about each file, which is often the day of the transfer rather than the day you posted. You can still put pages in any order when arranging the book.',
  },
  emailSteps: 'Email me these steps',
  sendToAddress: 'Send to this address',
  sent: 'Sent ✓',
  emailPlaceholder: 'your@email.com',
  signIn: 'Sign in with Google',
  opensWindow: 'Opens accounts.google.com. You sign in there — we never see your password.',
  signedIn: {
    title: 'Signed in with Google',
    text: 'Next, pick the photos for your book inside Google Photos. Look for the Data Transfer album — that is where Instagram put them. Choose as many as you like, then tap Done.',
    pick: 'Pick photos in Google Photos',
    note: 'Google only shares the photos you pick. Inbunden never sees the rest of your library.',
  },
  picking: {
    title: 'Waiting for your selection…',
    text: 'A Google Photos window opened. Choose your photos there and tap Done. This page updates by itself.',
    reopen: 'Nothing opened? Open Google Photos again',
  },
  errors: {
    denied: {
      title: 'No access was granted',
      text: 'The Google window was closed or you tapped Cancel, so nothing was shared with Inbunden. Try again whenever you are ready, or use the export instead.',
    },
    expired: {
      title: 'The sign-in timed out',
      text: 'Google did not answer in time, or the hour Google allows has passed. Sign in again, or use the export instead.',
    },
    unknown: {
      title: 'Something went wrong with Google',
      text: 'Google returned an error we did not expect. Try again in a minute, or use the export instead.',
    },
  },
  tryAgain: 'Try again',
  useExport: 'Use the export instead',
  importing: {
    account: 'Google Photos · signed in just now',
    connected: 'Connected',
    copying: 'Copying your photos…',
    note: 'We copy the photos you picked, at full size, and keep them until your book is done — then they are deleted.',
  },
  found: (n: number) => `Found ${n} photos`,
  foundFrom: (n: number, years: string) => `Found ${n} photos from ${years}`,
  foundStats: (videos: number) =>
    `${videos} videos skipped · no captions or likes — those stay on Instagram`,
  backToBooks: 'Back to My books',
  choosePhotos: 'Choose photos',
  readUntil: "Inbunden's access to Google Photos ends by itself within an hour.",
  disconnectNow: 'End it now',
  disconnected:
    'Access ended. Your copied photos stay until your book is done, then they are deleted.',
  storage:
    'Your photos are stored only to build your books, kept for 3 months, and deletable by you at any time. Google never shares your password with us.',
  libraryReady: (id: string) => `Library ${id} ready`,
};
