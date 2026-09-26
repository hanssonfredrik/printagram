import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Banner, Button, ScreenHeader, Segmented, StepCard, WizardBar } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { GuideScreen } from '@/components/guideArt';
import { EXPORT_SCREENS } from '@/components/guideScreens';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { api } from '@/services';

const GUIDE = {
  mobile: [
    [
      'Open your profile and the menu',
      'Tap your profile picture (bottom right), then the menu (☰) top right, then Settings and activity.',
    ],
    [
      'Accounts Center',
      'Tap Accounts Center at the top of the list, then Your information and permissions.',
    ],
    [
      'Export your information',
      'Tap Export your information, then Create export. On older app versions this is called Download your information → Download or transfer information.',
    ],
    [
      'Pick your profile and destination',
      'Select your Instagram profile (untick any Facebook account), then choose Export to device.',
    ],
    [
      'Choose Posts only',
      'Tap Customize information (or Some of your information), untick everything, and tick Posts under Your Instagram activity.',
    ],
    [
      'Set the options and start',
      'Date range: All time. Format: JSON. Media quality: Higher. Check the notification email, tap Start export and confirm with your Instagram password.',
    ],
  ],
  desktop: [
    [
      'Open Instagram settings',
      'Go to instagram.com, click More (bottom of the left sidebar), then Settings.',
    ],
    [
      'Accounts Center',
      'Click Accounts Center, then Your information and permissions in the left column. You can also go straight to accountscenter.instagram.com.',
    ],
    [
      'Export your information',
      'Click Export your information, then Create export. Older versions call this Download your information → Download or transfer information.',
    ],
    [
      'Pick your profile and destination',
      'Select your Instagram profile only, then choose Export to device.',
    ],
    [
      'Choose Posts only',
      'Under Customize information (or Some of your information), untick everything except Posts in Your Instagram activity.',
    ],
    [
      'Set the options and start',
      'Date range: All time. Format: JSON. Media quality: Higher. Click Start export and confirm with your Instagram password.',
    ],
  ],
} as const;

export function ExportGuide() {
  const nav = useNavigate();
  const tab = useDraft((d) => d.guideTab);
  const setTab = useDraft((d) => d.setGuideTab);
  const setSource = useDraft((d) => d.setSource);
  const email = useDraft((d) => d.email);
  const user = useSession((x) => x.user);
  const [sent, setSent] = useState(false);
  const [askEmail, setAskEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(email);

  useEffect(() => {
    setSource('export');
  }, [setSource]);

  const emailSteps = async () => {
    const target = user?.email ?? emailInput ?? email;
    if (!target || !target.includes('@')) {
      setAskEmail(true);
      return;
    }
    await api.sendExportSteps(target);
    setAskEmail(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="screen screen--bar">
      <ScreenHeader title="Get your photos from Instagram">
        <FlowProgress screen="guide" />
      </ScreenHeader>
      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        <p className="muted pretty">
          Instagram lets you download everything you've posted. It takes about two minutes to
          request, then Instagram emails you a link.
        </p>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mobile', label: 'On your phone' },
            { value: 'desktop', label: 'On a computer' },
          ]}
        />
        <div className="stack stack-12">
          {GUIDE[tab].map(([title, text], i) => (
            <StepCard
              key={title}
              n={i + 1}
              title={title}
              text={text}
              shot={<GuideScreen spec={EXPORT_SCREENS[tab][i]!} />}
              shotAspect={tab === 'mobile' ? '9 / 16' : '4 / 3'}
            />
          ))}
        </div>
        <Banner tone="info" title="What happens next">
          Instagram emails you a download link — usually within a few hours, sometimes a day or two
          (Instagram officially allows up to 30 days). The download stays available for only four
          days, so grab the ZIP as soon as it arrives and come back here. If the email doesn't show
          up, check spam or look under Export your information in Accounts Center.
        </Banner>
        <div className="stack stack-10">
          <Button block size="xl" onClick={() => nav('/export/waiting')}>
            I've requested my export
          </Button>
          {askEmail && (
            <div className="row gap-8 row-wrap">
              <input
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 16,
                  background: '#fff',
                }}
              />
            </div>
          )}
          <Button block variant="secondary" size="lg" onClick={emailSteps}>
            {sent
              ? 'Sent — check your inbox'
              : askEmail
                ? 'Send the steps to this address'
                : 'Email me these steps'}
          </Button>
          <Button variant="ghost" size="md" onClick={() => nav('/export/upload')}>
            Already have the ZIP? Upload it
          </Button>
        </div>
      </div>
      <WizardBar onBack={() => nav('/start')} />
    </div>
  );
}
