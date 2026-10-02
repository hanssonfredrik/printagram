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
          text: 'Tap Export your information, then Create export. In older versions of the app this is called Download your information.',
        },
        {
          title: 'Pick your profile and destination',
          text: 'Select your Instagram profile (untick any Facebook account) and tap Next. Then choose Export to device.',
        },
        {
          title: 'Choose Posts only',
          text: 'Tap Customize information, untick everything, then tick Posts under Your Instagram activity. Some versions call it Media.',
        },
        {
          title: 'Set the options and start',
          text: 'Set Date range to All time, Format to JSON and Media quality to the highest option. Check the email address for the notification, then tap Start export. Instagram may ask for your password to confirm.',
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
          text: 'Click Export your information, then Create export. In older versions this is called Download your information.',
        },
        {
          title: 'Pick your profile and destination',
          text: 'Select only your Instagram profile and click Next. Then choose Export to device.',
        },
        {
          title: 'Choose Posts only',
          text: 'Click Customize information, untick everything, then tick Posts under Your Instagram activity. Some versions call it Media.',
        },
        {
          title: 'Set the options and start',
          text: 'Set Date range to All time, Format to JSON and Media quality to the highest option. Click Start export. Instagram may ask for your password to confirm.',
        },
      ],
    },
    nextTitle: 'What happens next',
    nextBody:
      'Instagram emails you a download link, usually within a few hours. Sometimes it takes a day or two, and officially it can take up to 30 days. The link only works for four days, so download the ZIP as soon as it arrives and come back here. No email? Check your spam folder, or look under Available downloads in Export your information.',
    requested: "I've requested my export",
    emailPlaceholder: 'you@example.com',
    sent: 'Sent. Check your inbox.',
    sendToAddress: 'Send the steps to this address',
    emailSteps: 'Email me these steps',
    haveZip: 'Already have the ZIP? Upload it',
  },
  waiting: {
    title: 'Request sent',
    heading: 'Instagram is preparing your photos',
    body: 'This usually takes a few hours. Instagram emails you a download link. Download the ZIP, then come back here and upload it.',
    returnTitle: 'Get a return link',
    returnText: 'Continue on whichever device gets the ZIP, phone or computer.',
    emailPlaceholder: 'you@example.com',
    emailLabel: 'Email address',
    sending: 'Sending…',
    sendLink: 'Send link',
    linkSent: (email: string) => `Link sent to ${email}. Check your inbox.`,
    comingUp: 'Then you choose',
    squareOrPortrait: 'Square or portrait',
    anyCover: 'Any cover photo',
    captionsDates: 'Captions and dates',
    haveZip: 'I have the ZIP. Upload it',
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
        text: "It may be incomplete, or the download link may have expired. Download it again from Instagram's email, or request a new export.",
      },
      large: {
        title: 'File is too large',
        text: 'The upload limit is 8 GB. Request the export again for one year at a time, or with a lower media quality.',
      },
      unsupported: {
        title: "Some photos use a format we can't read",
        text: 'Those photos were skipped. Everything else was imported. Instagram exports normally contain JPEG and WebP files only.',
      },
      generic: {
        title: 'Something went wrong',
        text: "We couldn't import this file. Try again, and if it still fails, request a new export.",
      },
    },
    showSteps: 'Show the export steps again',
    dropTitle: 'Drop the ZIP here',
    dropBefore: 'The file Instagram sent you, as is. No need to unzip it. Usually named',
    dropFileName: 'instagram-yourname-….zip',
    dropAfter: '. Got several parts? Drop them all at once.',
    chooseFiles: 'Or choose files',
    files: (n: number) => `${n} file${n === 1 ? '' : 's'}`,
    reading: 'Reading your export…',
    readingDetail: (name: string, size: string) =>
      `${name} · ${size}. Looking for your posts. Nothing is uploaded yet.`,
    adding: (done: number, total: number) => `Adding photos · ${done} of ${total}`,
    keepOpen: 'Only your photos are uploaded · keep this tab open',
    stop: 'Stop here',
    finishing: 'Finishing up…',
    sorting: 'Sorting your photos by date.',
    added: (n: number) => `Added ${n} new photo${n === 1 ? '' : 's'}`,
    found: (n: number, years: string) => `Found ${n} photo${n === 1 ? '' : 's'} from ${years}`,
    stats: (posts: number, carousels: number, videos: number, cancelled: boolean) =>
      `${posts} post${posts === 1 ? '' : 's'} · ${carousels} carousel${carousels === 1 ? '' : 's'} · ${videos} video${videos === 1 ? '' : 's'} skipped${cancelled ? ' · stopped early' : ''}`,
    notes: {
      alreadyThere: (n: number) => `${n} ${n === 1 ? 'was' : 'were'} already in your library`,
      missing: (n: number) =>
        `${n} ${n === 1 ? 'is' : 'are'} in a part of the export you didn't add. Drop all the ZIP parts together`,
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
      'We keep your photos for 3 months, only to make your books. You can delete them any time. We never see your Instagram password.',
  },
};
