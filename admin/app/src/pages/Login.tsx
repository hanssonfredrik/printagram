import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { api } from '../api';
import { ErrorMsg } from '../components';

interface LoginResponse {
  challenge: string;
  enroll: { secret: string; uri: string } | null;
}

/** Step 1: Inbunden email + password. Step 2: authenticator code (or first-time enrollment). */
export function Login({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LoginResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!step?.enroll) return;
    QRCode.toDataURL(step.enroll.uri, { margin: 0, width: 184 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [step]);

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setStep(
        await api<LoginResponse>('auth/login', { method: 'POST', body: { email, password } }),
      );
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!step) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ email: string }>(step.enroll ? 'auth/enroll' : 'auth/totp', {
        method: 'POST',
        body: { challenge: step.challenge, code },
      });
      onSignedIn(r.email);
    } catch (err) {
      setError((err as Error).message);
      setCode('');
      if (/expired/i.test((err as Error).message)) setStep(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      {!step ? (
        <form className="card" onSubmit={submitPassword}>
          <h1>Inbunden Admin</h1>
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ErrorMsg error={error} />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form className="card" onSubmit={submitCode}>
          <h1>{step.enroll ? 'Set up your authenticator' : 'Authenticator code'}</h1>
          {step.enroll ? (
            <>
              <p className="muted">
                Scan this with an authenticator app (Microsoft Authenticator, Google Authenticator,
                1Password…), then enter the 6-digit code it shows. You only do this once.
              </p>
              {qr ? <img className="qr" src={qr} alt="QR code for the authenticator app" /> : null}
              <p className="muted">Or enter this key by hand:</p>
              <code className="secret">{step.enroll.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
            </>
          ) : (
            <p className="muted">Enter the 6-digit code from your authenticator app.</p>
          )}
          <label className="field">
            Code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <ErrorMsg error={error} />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Verifying…' : step.enroll ? 'Verify and sign in' : 'Sign in'}
          </button>
          <button type="button" className="btn" onClick={() => (setStep(null), setError(null))}>
            Start over
          </button>
        </form>
      )}
    </div>
  );
}
