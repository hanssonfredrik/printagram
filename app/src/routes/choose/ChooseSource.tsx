import { useNavigate } from 'react-router';
import { Banner, Bullet, Button, Card, Pill, ScreenHeader, WizardBar } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { useConfig, useSession } from '@/state/session';
import { useDraft } from '@/state/draft';

export function ChooseSource() {
  const nav = useNavigate();
  const cfg = useConfig();
  const adding = useDraft((d) => d.adding);
  const setSource = useDraft((d) => d.setSource);
  const libraries = useSession((x) => x.libraries);
  const libraryCount = libraries.reduce((n, l) => n + l.photoCount, 0);

  return (
    <div className="screen screen--bar">
      <ScreenHeader title="Bring in your photos">
        {adding && (
          <Banner tone="info" tight>
            <div className="row gap-10">
              <span className="check" style={{ background: '#fff' }}>
                +
              </span>
              <span>
                Adding to your library. Only posts newer than your last import are added — the{' '}
                {libraryCount} photos you already have stay as they are.
              </span>
            </div>
          </Banner>
        )}
        <FlowProgress screen="choose" />
      </ScreenHeader>

      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        <p className="muted pretty">
          Two ways to get your posts into Printagram. Both are read‑only, and neither shares your
          password with us.
        </p>

        <div className="grid-auto grid-auto--300" style={{ alignItems: 'stretch' }}>
          <Card bordered radius="xl">
            <div className="row gap-8">
              {cfg.connectEnabled ? <Pill>Instant</Pill> : <Pill tone="muted">Coming soon</Pill>}
            </div>
            <div className="h3">Connect Instagram</div>
            <p className="muted pretty" style={{ fontSize: 15 }}>
              Log in on Instagram's own site and allow Printagram to read your posts. Your photos
              show up here right away.
            </p>
            <div className="stack stack-10">
              <Bullet>
                Needs a Creator or Business account. Switching is free, takes two minutes and is
                reversible.
              </Bullet>
              <Bullet>Brings your likes along, so you can print your most‑loved posts.</Bullet>
              <Bullet warn>
                Professional accounts are public. Want to stay private? Use the export.
              </Bullet>
            </div>
            <div className="stack stack-8" style={{ marginTop: 'auto', paddingTop: 6 }}>
              {cfg.connectEnabled ? (
                <Button
                  block
                  onClick={() => {
                    setSource('connect');
                    nav('/connect');
                  }}
                >
                  Connect Instagram
                </Button>
              ) : (
                <Banner tone="soft" tight>
                  <span className="tiny">
                    We're waiting for Instagram to approve Printagram. Until then, use the export —
                    it works for every account.
                  </span>
                </Banner>
              )}
            </div>
          </Card>

          <Card bordered radius="xl">
            <div className="row gap-8">
              <Pill>Works for every account</Pill>
            </div>
            <div className="h3">Upload your export</div>
            <p className="muted pretty" style={{ fontSize: 15 }}>
              Ask Instagram for a copy of your posts, then drop the ZIP here. Nothing about your
              account changes.
            </p>
            <div className="stack stack-10">
              <Bullet>Personal, private, Creator or Business — every account works.</Bullet>
              <Bullet>
                Instagram emails you the file — a few hours, sometimes a day or two. We send you a
                return link.
              </Bullet>
              <Bullet warn>Likes usually aren't included in the export.</Bullet>
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
                Show me how
              </Button>
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
            Not sure which account you have?
          </span>
          <span>
            Open your own profile in the Instagram app. A{' '}
            <span style={{ color: 'var(--text)' }}>Professional dashboard</span> button under your
            bio means Creator or Business. No button means personal.
          </span>
        </div>
      </div>
      <WizardBar onBack={() => nav(adding ? '/books' : '/')} />
    </div>
  );
}
