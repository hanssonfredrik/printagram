import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Banner, Button, Card, FieldInput, Fieldset } from '@/components/ui';
import { api, ApiClientError } from '@/services';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { errorText, useT } from '@/i18n';

export function SignIn() {
  const nav = useNavigate();
  const t = useT();
  const ta = t.auth.signIn;
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/books';
  const email = useDraft((d) => d.email);
  const setEmail = useDraft((d) => d.setEmail);
  const setUser = useSession((x) => x.setUser);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const user = useSession((x) => x.user);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState<'idle' | 'sending' | 'sent' | 'resent'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      // If this browser already holds uploads under an anonymous session, merge them into the account.
      const merge = user?.authLevel === 'anonymous';
      const u = await api.login(email, password, merge);
      setUser(u);
      await refreshLibraries();
      nav(next);
    } catch (e2) {
      setErr(
        e2 instanceof ApiClientError
          ? errorText(e2, t, { UNAUTHORIZED: ta.wrongPassword })
          : ta.failed,
      );
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (again = false) => {
    setErr(null);
    setForgot('sending');
    try {
      await api.forgotPassword(email);
      setForgot(again ? 'resent' : 'sent');
    } catch (e2) {
      setForgot('idle');
      setErr(e2 instanceof ApiClientError ? errorText(e2, t) : ta.failed);
    }
  };

  const forgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setErr(ta.emailFirst);
      return;
    }
    void sendReset();
  };

  if (forgot === 'sent' || forgot === 'resent') {
    return (
      <div
        className="screen"
        role="status"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Card
          bordered
          radius="2xl"
          pad="hero"
          center
          gap={16}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <div className="check check--done" style={{ width: 56, height: 56, fontSize: 28 }}>
            ✓
          </div>
          <h2 className="h2" style={{ fontSize: 28 }}>
            {ta.sentTitle}
          </h2>
          <p className="pretty" style={{ fontSize: 17 }}>
            {ta.sentTo(email)}
          </p>
          <p className="small muted pretty">{ta.sentHelp}</p>
          <Button block size="lg" onClick={() => setForgot('idle')}>
            {ta.backToSignIn}
          </Button>
          <Button
            block
            variant="secondary"
            disabled={forgot === 'resent'}
            onClick={() => void sendReset(true)}
          >
            {forgot === 'resent' ? ta.sentAgainDone : ta.sentAgain}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <form className="stack stack-20" style={{ width: '100%', maxWidth: 400 }} onSubmit={submit}>
        <div className="row gap-12">
          <button
            type="button"
            className="back"
            onClick={() => nav('/')}
            aria-label={t.common.back}
          >
            ←
          </button>
          <span className="brand">{t.common.brand}</span>
        </div>
        <div>
          <h2 className="h2" style={{ fontSize: 28, marginBottom: 6 }}>
            {ta.title}
          </h2>
          <p className="muted">{ta.lead}</p>
        </div>
        <Fieldset>
          <FieldInput
            placeholder={ta.email}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={ta.email}
            required
          />
          <FieldInput
            placeholder={ta.password}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label={ta.password}
          />
        </Fieldset>
        {err && (
          <Banner tone="error" tight>
            {err}
          </Banner>
        )}
        <Button type="submit" block size="xl" disabled={busy}>
          {busy ? ta.busy : ta.submit}
        </Button>
        <div className="row between row-wrap gap-8 small">
          <a href="#" onClick={forgotPassword} aria-disabled={forgot === 'sending'}>
            {forgot === 'sending' ? ta.sending : ta.forgot}
          </a>
          <span className="muted">
            {ta.newHere} <Link to="/start">{ta.start}</Link>
          </span>
        </div>
      </form>
    </div>
  );
}
