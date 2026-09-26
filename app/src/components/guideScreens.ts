/** What each guide drawing shows (see GuideScreen in guideArt.tsx). */
import type { Lang } from '@printagram/shared';

export type GuideRow =
  | { bar: number } // placeholder row, width in %
  | { label: string; hi?: boolean; check?: boolean; value?: string; button?: boolean };

export interface GuideScreenSpec {
  title: string;
  rows: GuideRow[];
  /** Browser window instead of a phone. */
  desktop?: boolean;
  /** Small section heading above the rows. */
  section?: string;
}

const bars = (...w: number[]): GuideRow[] => w.map((bar) => ({ bar }));

/** Instagram's own UI labels, as the app shows them in each language. */
const IG_EN = {
  yourname: 'yourname',
  settingsAndActivity: 'Settings and activity',
  accountsCenter: 'Accounts Center',
  yourInformation: 'Your information',
  exportYourInformation: 'Export your information',
  createExport: 'Create export',
  instagramProfile: 'Instagram profile',
  exportToDevice: 'Export to device',
  customizeInformation: 'Customize information',
  customize: 'Customize',
  yourInstagramActivity: 'Your Instagram activity',
  posts: 'Posts',
  stories: 'Stories',
  reels: 'Reels',
  messages: 'Messages',
  dateRange: 'Date range',
  allTime: 'All time',
  format: 'Format',
  mediaQuality: 'Media quality',
  higher: 'Higher',
  startExport: 'Start export',
  moreSettings: 'More → Settings',
  settings: 'Settings',
  forProfessionals: 'For professionals',
  accountTypeAndTools: 'Account type and tools',
  switchToProfessional: 'Switch to professional account',
  whatDescribesYou: 'What best describes you?',
  photographer: 'Photographer',
  blogger: 'Blogger',
  personalBlog: 'Personal blog',
  displayOnProfile: 'Display on profile',
  off: 'Off',
  areYouCreator: 'Are you a creator?',
  creator: 'Creator',
  business: 'Business',
  next: 'Next',
  professionalDashboard: 'Professional dashboard',
};

const IG: Record<Lang, typeof IG_EN> = {
  en: IG_EN,
  sv: {
    yourname: 'dittnamn',
    settingsAndActivity: 'Inställningar och aktivitet',
    accountsCenter: 'Kontocenter',
    yourInformation: 'Din information',
    exportYourInformation: 'Exportera din information',
    createExport: 'Skapa export',
    instagramProfile: 'Instagram-profil',
    exportToDevice: 'Exportera till enhet',
    customizeInformation: 'Anpassa information',
    customize: 'Anpassa',
    yourInstagramActivity: 'Din Instagram-aktivitet',
    posts: 'Inlägg',
    stories: 'Stories',
    reels: 'Reels',
    messages: 'Meddelanden',
    dateRange: 'Datumintervall',
    allTime: 'Hela tiden',
    format: 'Format',
    mediaQuality: 'Mediekvalitet',
    higher: 'Högre',
    startExport: 'Starta export',
    moreSettings: 'Mer → Inställningar',
    settings: 'Inställningar',
    forProfessionals: 'För professionella',
    accountTypeAndTools: 'Kontotyp och verktyg',
    switchToProfessional: 'Byt till professionellt konto',
    whatDescribesYou: 'Vad beskriver dig bäst?',
    photographer: 'Fotograf',
    blogger: 'Bloggare',
    personalBlog: 'Personlig blogg',
    displayOnProfile: 'Visa på profilen',
    off: 'Av',
    areYouCreator: 'Är du kreatör?',
    creator: 'Kreatör',
    business: 'Företag',
    next: 'Nästa',
    professionalDashboard: 'Professionell översikt',
  },
};

const profileMenu = (l: typeof IG_EN): GuideScreenSpec => ({
  title: `${l.yourname}  ☰`,
  rows: [{ label: l.settingsAndActivity, hi: true }, ...bars(60, 45, 52, 38)],
});

/* ---------- Screens for the export guide ---------- */

export function exportScreens(lang: Lang): Record<'mobile' | 'desktop', GuideScreenSpec[]> {
  const l = IG[lang];
  return {
    mobile: [
      profileMenu(l),
      {
        title: l.settingsAndActivity,
        rows: [{ label: l.accountsCenter, hi: true }, ...bars(55, 62, 40, 50)],
      },
      {
        title: l.yourInformation,
        rows: [
          { label: l.exportYourInformation, hi: true },
          ...bars(58, 46),
          { label: l.createExport, button: true },
        ],
      },
      {
        title: l.createExport,
        rows: [
          { label: l.instagramProfile, check: true },
          { label: l.exportToDevice, hi: true },
          ...bars(56),
        ],
      },
      {
        title: l.customizeInformation,
        section: l.yourInstagramActivity,
        rows: [
          { label: l.posts, check: true, hi: true },
          { label: l.stories, check: false },
          { label: l.reels, check: false },
          { label: l.messages, check: false },
        ],
      },
      {
        title: l.exportToDevice,
        rows: [
          { label: l.dateRange, value: l.allTime },
          { label: l.format, value: 'JSON' },
          { label: l.mediaQuality, value: l.higher },
          { label: l.startExport, button: true, hi: true },
        ],
      },
    ],
    desktop: [
      {
        title: 'Instagram',
        desktop: true,
        rows: [...bars(50), { label: l.moreSettings, hi: true }],
      },
      {
        title: l.settings,
        desktop: true,
        rows: [{ label: l.accountsCenter, hi: true }, ...bars(45)],
      },
      {
        title: l.yourInformation,
        desktop: true,
        rows: [
          { label: l.exportYourInformation, hi: true },
          { label: l.createExport, button: true },
        ],
      },
      {
        title: l.createExport,
        desktop: true,
        rows: [
          { label: l.instagramProfile, check: true },
          { label: l.exportToDevice, hi: true },
        ],
      },
      {
        title: l.customize,
        desktop: true,
        rows: [
          { label: l.posts, check: true, hi: true },
          { label: l.stories, check: false },
        ],
      },
      {
        title: l.exportToDevice,
        desktop: true,
        rows: [
          { label: l.format, value: 'JSON' },
          { label: l.startExport, button: true, hi: true },
        ],
      },
    ],
  };
}

/* ---------- Screens for switching to a professional account ---------- */

export function switchScreens(lang: Lang): GuideScreenSpec[] {
  const l = IG[lang];
  return [
    profileMenu(l),
    {
      title: l.settingsAndActivity,
      section: l.forProfessionals,
      rows: [{ label: l.accountTypeAndTools, hi: true }, ...bars(50, 44)],
    },
    {
      title: l.accountTypeAndTools,
      rows: [{ label: l.switchToProfessional, hi: true }, ...bars(48, 56)],
    },
    {
      title: l.whatDescribesYou,
      rows: [
        { label: l.photographer, check: true, hi: true },
        { label: l.blogger, check: false },
        { label: l.personalBlog, check: false },
        { label: l.displayOnProfile, value: l.off },
      ],
    },
    {
      title: l.areYouCreator,
      rows: [
        { label: l.creator, check: true, hi: true },
        { label: l.business, check: false },
        { label: l.next, button: true },
      ],
    },
  ];
}

export function professionalDashboard(lang: Lang): GuideScreenSpec {
  const l = IG[lang];
  return {
    title: l.yourname,
    rows: [...bars(70, 50), { label: l.professionalDashboard, hi: true }, ...bars(44)],
  };
}
