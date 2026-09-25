/** What each guide drawing shows (see GuideScreen in guideArt.tsx). */

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

/* ---------- Screens for the export guide ---------- */

const PROFILE_MENU: GuideScreenSpec = {
  title: 'yourname  ☰',
  rows: [{ label: 'Settings and activity', hi: true }, ...bars(60, 45, 52, 38)],
};

export const EXPORT_SCREENS: Record<'mobile' | 'desktop', GuideScreenSpec[]> = {
  mobile: [
    PROFILE_MENU,
    {
      title: 'Settings and activity',
      rows: [{ label: 'Accounts Center', hi: true }, ...bars(55, 62, 40, 50)],
    },
    {
      title: 'Your information',
      rows: [
        { label: 'Export your information', hi: true },
        ...bars(58, 46),
        { label: 'Create export', button: true },
      ],
    },
    {
      title: 'Create export',
      rows: [
        { label: 'Instagram profile', check: true },
        { label: 'Export to device', hi: true },
        ...bars(56),
      ],
    },
    {
      title: 'Customize information',
      section: 'Your Instagram activity',
      rows: [
        { label: 'Posts', check: true, hi: true },
        { label: 'Stories', check: false },
        { label: 'Reels', check: false },
        { label: 'Messages', check: false },
      ],
    },
    {
      title: 'Export to device',
      rows: [
        { label: 'Date range', value: 'All time' },
        { label: 'Format', value: 'JSON' },
        { label: 'Media quality', value: 'Higher' },
        { label: 'Start export', button: true, hi: true },
      ],
    },
  ],
  desktop: [
    {
      title: 'Instagram',
      desktop: true,
      rows: [...bars(50), { label: 'More → Settings', hi: true }],
    },
    {
      title: 'Settings',
      desktop: true,
      rows: [{ label: 'Accounts Center', hi: true }, ...bars(45)],
    },
    {
      title: 'Your information',
      desktop: true,
      rows: [
        { label: 'Export your information', hi: true },
        { label: 'Create export', button: true },
      ],
    },
    {
      title: 'Create export',
      desktop: true,
      rows: [
        { label: 'Instagram profile', check: true },
        { label: 'Export to device', hi: true },
      ],
    },
    {
      title: 'Customize',
      desktop: true,
      rows: [
        { label: 'Posts', check: true, hi: true },
        { label: 'Stories', check: false },
      ],
    },
    {
      title: 'Export to device',
      desktop: true,
      rows: [
        { label: 'Format', value: 'JSON' },
        { label: 'Start export', button: true, hi: true },
      ],
    },
  ],
};

/* ---------- Screens for switching to a professional account ---------- */

export const SWITCH_SCREENS: GuideScreenSpec[] = [
  PROFILE_MENU,
  {
    title: 'Settings and activity',
    section: 'For professionals',
    rows: [{ label: 'Account type and tools', hi: true }, ...bars(50, 44)],
  },
  {
    title: 'Account type and tools',
    rows: [{ label: 'Switch to professional account', hi: true }, ...bars(48, 56)],
  },
  {
    title: 'What best describes you?',
    rows: [
      { label: 'Photographer', check: true, hi: true },
      { label: 'Blogger', check: false },
      { label: 'Personal blog', check: false },
      { label: 'Display on profile', value: 'Off' },
    ],
  },
  {
    title: 'Are you a creator?',
    rows: [
      { label: 'Creator', check: true, hi: true },
      { label: 'Business', check: false },
      { label: 'Next', button: true },
    ],
  },
];

export const PROFESSIONAL_DASHBOARD: GuideScreenSpec = {
  title: 'yourname',
  rows: [...bars(70, 50), { label: 'Professional dashboard', hi: true }, ...bars(44)],
};
