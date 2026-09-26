import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Input, ScreenHeader, Spinner, WizardBar } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { api } from '@/services';
import { artGradient } from '@/components/art';
import { errorText, useT } from '@/i18n';

export function Waiting() {
  const nav = useNavigate();
  const t = useT();
  const w = t.exportFlow.waiting;
  const email = useDraft((d) => d.email);
  const setEmail = useDraft((d) => d.setEmail);
  const returnSentTo = useDraft((d) => d.returnSentTo);
  const setReturnSentTo = useDraft((d) => d.setReturnSentTo);
  const setSource = useDraft((d) => d.setSource);
  const ensureSession = useSession((x) => x.ensureSession);
  const setUser = useSession((x) => x.setUser);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSource('export');
  }, [setSource]);

  const send = async () => {
    if (!email.includes('@')) {
      setErr(t.errors.codes.INVALID_EMAIL);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const u = await ensureSession();
      await api.sendReturnLink(email, '/export/upload');
      setUser({
        ...u,
        email: u.email ?? email.toLowerCase(),
        authLevel: u.authLevel === 'anonymous' ? 'email' : u.authLevel,
      });
      setReturnSentTo(email);
    } catch (e) {
      setErr(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen screen--bar">
      <ScreenHeader title={w.title}>
        <FlowProgress screen="waiting" />
      </ScreenHeader>
      <div
        className="container container--form stack stack-24 center"
        style={{ paddingTop: 24, alignItems: 'center' }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            background: 'var(--primary-tint)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Spinner variant="slow" />
        </div>
        <div>
          <h2 className="h2" style={{ fontSize: 28, marginBottom: 8 }}>
            {w.heading}
          </h2>
          <p className="muted pretty">{w.body}</p>
        </div>
        <Card bordered pad="mid" style={{ width: '100%', textAlign: 'left', padding: 18 }} gap={10}>
          <div className="semibold">{w.returnTitle}</div>
          <div className="small muted">{w.returnText}</div>
          {!returnSentTo ? (
            <>
              <div className="row row-wrap gap-8">
                <Input
                  type="email"
                  bg
                  placeholder={w.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: 1, minWidth: 180, width: 'auto' }}
                  aria-label={w.emailLabel}
                />
                <Button
                  size="md"
                  style={{ borderRadius: 12, padding: '12px 18px' }}
                  onClick={send}
                  disabled={busy}
                >
                  {busy ? w.sending : w.sendLink}
                </Button>
              </div>
              {err && (
                <div className="tiny" style={{ color: 'var(--error-text)' }}>
                  {err}
                </div>
              )}
            </>
          ) : (
            <div
              className="row gap-10 small"
              style={{
                color: 'var(--primary-deep)',
                background: 'var(--primary-tint)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <span>✓</span>
              {w.linkSent(returnSentTo)}
            </div>
          )}
        </Card>
        <div className="stack stack-10" style={{ width: '100%', textAlign: 'left' }}>
          <div className="tiny semibold muted">{w.comingUp}</div>
          <div className="grid-3">
            <div
              className="stack stack-8"
              style={{ background: '#fff', borderRadius: 14, padding: 12, alignItems: 'center' }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--placeholder)',
                }}
              />
              <div className="micro muted">{w.squareOrPortrait}</div>
            </div>
            <div
              className="stack stack-8"
              style={{ background: '#fff', borderRadius: 14, padding: 12, alignItems: 'center' }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  background: artGradient(0),
                }}
              />
              <div className="micro muted">{w.anyCover}</div>
            </div>
            <div
              className="stack stack-8"
              style={{ background: '#fff', borderRadius: 14, padding: 12, alignItems: 'center' }}
            >
              <div
                className="serif"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  background: '#fff',
                  border: '1px solid var(--placeholder)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9,
                }}
              >
                Aa
              </div>
              <div className="micro muted">{w.captionsDates}</div>
            </div>
          </div>
        </div>
        <Button block variant="secondary" size="lg" onClick={() => nav('/export/upload')}>
          {w.haveZip}
        </Button>
      </div>
      <WizardBar onBack={() => nav('/export')} />
    </div>
  );
}
