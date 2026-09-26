import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Banner, Button, ScreenHeader, Segmented, StepCard, WizardBar } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { GuideScreen } from '@/components/guideArt';
import { exportScreens } from '@/components/guideScreens';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { api } from '@/services';
import { useLang, useT } from '@/i18n';

export function ExportGuide() {
  const nav = useNavigate();
  const t = useT();
  const lang = useLang((x) => x.lang);
  const g = t.exportFlow.guide;
  const screens = exportScreens(lang);
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
      <ScreenHeader title={g.title}>
        <FlowProgress screen="guide" />
      </ScreenHeader>
      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        <p className="muted pretty">{g.intro}</p>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mobile', label: g.onPhone },
            { value: 'desktop', label: g.onComputer },
          ]}
        />
        <div className="stack stack-12">
          {g.steps[tab].map(({ title, text }, i) => (
            <StepCard
              key={title}
              n={i + 1}
              title={title}
              text={text}
              shot={<GuideScreen spec={screens[tab][i]!} />}
              shotAspect={tab === 'mobile' ? '9 / 16' : '4 / 3'}
            />
          ))}
        </div>
        <Banner tone="info" title={g.nextTitle}>
          {g.nextBody}
        </Banner>
        <div className="stack stack-10">
          <Button block size="xl" onClick={() => nav('/export/waiting')}>
            {g.requested}
          </Button>
          {askEmail && (
            <div className="row gap-8 row-wrap">
              <input
                type="email"
                placeholder={g.emailPlaceholder}
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
            {sent ? g.sent : askEmail ? g.sendToAddress : g.emailSteps}
          </Button>
          <Button variant="ghost" size="md" onClick={() => nav('/export/upload')}>
            {g.haveZip}
          </Button>
        </div>
      </div>
      <WizardBar onBack={() => nav('/start')} />
    </div>
  );
}
