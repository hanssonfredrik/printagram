import { useNavigate } from 'react-router';
import { Banner, Bullet, Button, Card, Pill, ScreenHeader, WizardBar } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { useConfig, useSession } from '@/state/session';
import { useDraft } from '@/state/draft';
import { useT } from '@/i18n';

export function ChooseSource() {
  const nav = useNavigate();
  const t = useT();
  const tc = t.choose;
  const cfg = useConfig();
  const adding = useDraft((d) => d.adding);
  const setSource = useDraft((d) => d.setSource);
  const libraries = useSession((x) => x.libraries);
  const libraryCount = libraries.reduce((n, l) => n + l.photoCount, 0);

  return (
    <div className="screen screen--bar">
      <ScreenHeader title={tc.title}>
        {adding && (
          <Banner tone="info" tight>
            <div className="row gap-10">
              <span className="check" style={{ background: '#fff' }}>
                +
              </span>
              <span>{tc.adding(libraryCount)}</span>
            </div>
          </Banner>
        )}
        <FlowProgress screen="choose" />
      </ScreenHeader>

      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        <p className="muted pretty">{tc.intro}</p>

        <div className="grid-auto grid-auto--300" style={{ alignItems: 'stretch' }}>
          {cfg.googlePhotosEnabled && (
            <Card bordered radius="xl">
              <div className="row gap-8">
                <Pill>{tc.google.pill}</Pill>
              </div>
              <div className="h3">{tc.google.title}</div>
              <p className="muted pretty" style={{ fontSize: 15 }}>
                {tc.google.text}
              </p>
              <div className="stack stack-10">
                <Bullet>{tc.google.every}</Bullet>
                <Bullet>{tc.google.background}</Bullet>
                <Bullet warn>{tc.google.noCaptions}</Bullet>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                <Button
                  block
                  onClick={() => {
                    setSource('google');
                    nav('/google');
                  }}
                >
                  {tc.google.button}
                </Button>
              </div>
            </Card>
          )}

          <Card bordered radius="xl">
            <div className="row gap-8">
              <Pill>{tc.export.pill}</Pill>
            </div>
            <div className="h3">{tc.export.title}</div>
            <p className="muted pretty" style={{ fontSize: 15 }}>
              {tc.export.text}
            </p>
            <div className="stack stack-10">
              <Bullet>{tc.export.every}</Bullet>
              <Bullet>{tc.export.email}</Bullet>
              <Bullet warn>{tc.export.noLikes}</Bullet>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 6 }}>
              <Button
                block
                variant="outline"
                onClick={() => {
                  setSource('export');
                  nav('/export');
                }}
              >
                {tc.export.button}
              </Button>
            </div>
          </Card>

          <Card bordered radius="xl">
            <div className="row gap-8">
              {cfg.connectEnabled ? (
                <Pill>{tc.instant}</Pill>
              ) : (
                <Pill tone="muted">{tc.comingSoon}</Pill>
              )}
            </div>
            <div className="h3">{tc.connect.title}</div>
            <p className="muted pretty" style={{ fontSize: 15 }}>
              {tc.connect.text}
            </p>
            <div className="stack stack-10">
              <Bullet>{tc.connect.needsPro}</Bullet>
              <Bullet>{tc.connect.likes}</Bullet>
              <Bullet warn>{tc.connect.public}</Bullet>
            </div>
            <div className="stack stack-8" style={{ marginTop: 'auto', paddingTop: 6 }}>
              {cfg.connectEnabled ? (
                <Button
                  block
                  variant="outline"
                  onClick={() => {
                    setSource('connect');
                    nav('/connect');
                  }}
                >
                  {tc.connect.button}
                </Button>
              ) : (
                <Banner tone="soft" tight>
                  <span className="tiny">{tc.connect.waiting}</span>
                </Banner>
              )}
            </div>
          </Card>
        </div>

        <div
          className="row gap-12 small muted pretty"
          style={{
            alignItems: 'flex-start',
            background: 'var(--surface-2)',
            borderRadius: 16,
            padding: '14px 16px',
          }}
        >
          <span className="semibold" style={{ color: 'var(--text)', flex: 'none' }}>
            {tc.unsure.title}
          </span>
          <span>
            {tc.unsure.before}
            <span style={{ color: 'var(--text)' }}>{tc.unsure.button}</span>
            {tc.unsure.after}
          </span>
        </div>
      </div>
      <WizardBar onBack={() => nav(adding ? '/books' : '/')} />
    </div>
  );
}
