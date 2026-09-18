import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Banner, Button, FieldInput, Fieldset } from '@/components/ui';
import { api, ApiClientError } from '@/services';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';

export function SignIn() {
  const nav = useNavigate();
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
  const [forgot, setForgot] = useState<'idle' | 'sent'>('idle');

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
      setErr(e2 instanceof ApiClientError ? e2.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setErr('Enter your email above first, then tap Forgot password.');
      return;
    }
    await api.forgotPassword(email);
    setForgot('sent');
  };

  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <form className="stack stack-20" style={{ width: '100%', maxWidth: 400 }} onSubmit={submit}>
        <div className="row gap-12">
          <button type="button" className="back" onClick={() => nav('/')} aria-label="Back">
            ←
          </button>
          <span className="brand">Printagram</span>
        </div>
        <div>
          <h2 className="h2" style={{ fontSize: 28, marginBottom: 6 }}>
            Welcome back
          </h2>
          <p className="muted">Your photos and books are waiting.</p>
        </div>
        <Fieldset>
          <FieldInput
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            required
          />
          <FieldInput
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
        </Fieldset>
        {err && (
          <Banner tone="error" tight>
            {err}
          </Banner>
        )}
        {forgot === 'sent' && (
          <Banner tone="info" tight>
            If that address has an account, a reset link is on its way.
          </Banner>
        )}
        <Button type="submit" block size="xl" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="row between row-wrap gap-8 small">
          <a href="#" onClick={forgotPassword}>
            Forgot password?
          </a>
          <span className="muted">
            New here? <Link to="/start">Start your book</Link>
          </span>
        </div>
      </form>
    </div>
  );
}
