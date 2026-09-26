/** Export guide, waiting for Instagram's email, and uploading the ZIP. */
export const exportFlow = {
  guide: {
    title: 'Get your photos from Instagram',
    intro:
      "Instagram lets you download everything you've posted. It takes about two minutes to request, then Instagram emails you a link.",
    onPhone: 'On your phone',
    onComputer: 'On a computer',
    steps: {
      mobile: [
        {
          title: 'Open your profile and the menu',
          text: 'Tap your profile picture (bottom right), then the menu (☰) top right, then Settings and activity.',
        },
        {
          title: 'Accounts Center',
          text: 'Tap Accounts Center at the top of the list, then Your information and permissions.',
        },
        {
          title: 'Export your information',
          text: 'Tap Export your information, then Create export. On older app versions this is called Download your information → Download or transfer information.',
        },
        {
          title: 'Pick your profile and destination',
          text: 'Select your Instagram profile (untick any Facebook account), then choose Export to device.',
        },
        {
          title: 'Choose Posts only',
          text: 'Tap Customize information (or Some of your information), untick everything, and tick Posts under Your Instagram activity.',
        },
        {
          title: 'Set the options and start',
          text: 'Date range: All time. Format: JSON. Media quality: Higher. Check the notification email, tap Start export and confirm with your Instagram password.',
        },
      ],
      desktop: [
        {
          title: 'Open Instagram settings',
          text: 'Go to instagram.com, click More (bottom of the left sidebar), then Settings.',
        },
        {
          title: 'Accounts Center',
          text: 'Click Accounts Center, then Your information and permissions in the left column. You can also go straight to accountscenter.instagram.com.',
        },
        {
          title: 'Export your information',
          text: 'Click Export your information, then Create export. Older versions call this Download your information → Download or transfer information.',
        },
        {
          title: 'Pick your profile and destination',
          text: 'Select your Instagram profile only, then choose Export to device.',
        },
        {
          title: 'Choose Posts only',
          text: 'Under Customize information (or Some of your information), untick everything except Posts in Your Instagram activity.',
        },
        {
          title: 'Set the options and start',
          text: 'Date range: All time. Format: JSON. Media quality: Higher. Click Start export and confirm with your Instagram password.',
        },
      ],
    },
    nextTitle: 'What happens next',
    nextBody:
      "Instagram emails you a download link — usually within a few hours, sometimes a day or two (Instagram officially allows up to 30 days). The download stays available for only four days, so grab the ZIP as soon as it arrives and come back here. If the email doesn't show up, check spam or look under Export your information in Accounts Center.",
    requested: "I've requested my export",
    emailPlaceholder: 'you@example.com',
    sent: 'Sent — check your inbox',
    sendToAddress: 'Send the steps to this address',
    emailSteps: 'Email me these steps',
    haveZip: 'Already have the ZIP? Upload it',
  },
  waiting: {
    title: 'Almost there',
    heading: 'Instagram is preparing your photos',
    body: "This usually takes a few hours. You'll get an email from Instagram with a download link. Then come back here and upload the ZIP.",
    returnTitle: 'Get a return link',
    returnText: 'Continue on any device — phone, laptop, wherever the ZIP lands.',
    emailPlaceholder: 'you@example.com',
    emailLabel: 'Email address',
    sending: 'Sending…',
    sendLink: 'Send link',
    linkSent: (email: string) => `Link sent to ${email}. Check your inbox.`,
    comingUp: 'Coming up: your book, your way',
    squareOrPortrait: 'Square or portrait',
    anyCover: 'Any cover photo',
    captionsDates: 'Captions & dates',
    haveZip: 'I have my ZIP — upload it',
  },
  upload: {
    title: 'Upload your Instagram export',
    errors: {
      html: {
        title: 'This export is in HTML format',
        text: 'We need the JSON version to read your posts and dates. Request the export again and pick Format: JSON.',
      },
      empty: {
        title: 'No posts in this export',
        text: "The file doesn't contain any posts. When requesting, make sure Posts is ticked under Your Instagram activity.",
      },
      corrupt: {
        title: "We couldn't open this file",
        text: "It may be incomplete or the Instagram download link may have expired. Download it again from Instagram's email, or request a new export.",
      },
      large: {
        title: 'File is too large',
        text: 'The upload limit is 8 GB. Try requesting the export in parts (by year), or with Media quality: Medium.',
      },
      unsupported: {
        title: "Some photos use a format we can't read",
        text: 'Those photos were skipped. Everything else was imported. Instagram exports normally contain JPEG and WebP files only.',
      },
      generic: {
        title: 'Something went wrong',
        text: 'We could not import this file. Please try again, and if it keeps failing, request a new export.',
      },
    },
    showSteps: 'Show the export steps again',
    dropTitle: 'Drop the ZIP here',
    dropBefore: 'The file Instagram sent you, as is. No need to unzip it. Usually named',
    dropFileName: 'instagram-yourname-….zip',
    dropAfter: '. Got several parts? Drop them all at once.',
    chooseFiles: 'Or choose files',
    files: (n: number) => `${n} files`,
    reading: 'Reading your export…',
    readingDetail: (name: string, size: string) =>
      `${name} · ${size}. Looking for your posts — nothing is uploaded yet.`,
    adding: (done: number, total: number) => `Adding photos · ${done} of ${total}`,
    keepOpen: 'Only your photos are uploaded · keep this tab open',
    stop: 'Stop here',
    finishing: 'Finishing up…',
    sorting: 'Sorting your photos by date.',
    added: (n: number) => `Added ${n} new photo${n === 1 ? '' : 's'}`,
    found: (n: number, years: string) => `Found ${n} photos from ${years}`,
    stats: (posts: number, carousels: number, videos: number, cancelled: boolean) =>
      `${posts} posts · ${carousels} carousels · ${videos} videos skipped${cancelled ? ' · stopped early' : ''}`,
    notes: {
      alreadyThere: (n: number) => `${n} ${n === 1 ? 'was' : 'were'} already in your library`,
      missing: (n: number) =>
        `${n} ${n === 1 ? 'is' : 'are'} in a part of the export you didn't add — drop all the ZIP parts together`,
      unsupported: (n: number) => `${n} ${n === 1 ? 'uses' : 'use'} a format we can't print`,
      failed: (n: number) => `${n} could not be read or uploaded`,
      intro: (list: string) => `Of the photos in your export: ${list}.`,
    },
    archived: (n: number) => `Your export also has ${n} archived post${n === 1 ? '' : 's'}.`,
    addIt: 'Add it too',
    addThem: 'Add them too',
    backToBooks: 'Back to My books',
    choosePhotos: 'Choose photos',
    privacy:
      'Your photos are stored only to build your books, kept for 3 months, and deletable by you at any time. We never see your Instagram login.',
  },
};
