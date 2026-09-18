import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Banner, Button, Card, FieldInput, Fieldset } from '@/components/ui';
import { api } from '@/services';
import { useSession } from '@/state/session';

export function ResetPassword() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const setUser = useSession((x) => x.setUser);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErr('Use at least 8 characters.');
    if (password !== again) return setErr('The two passwords do not match.');
    setBusy(true);
    setErr(null);
    try {
      setUser(await api.resetPassword(token, password));
      nav('/books', { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'This link is no longer valid.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <Card bordered radius="2xl" pad="hero" style={{ width: '100%', maxWidth: 420 }} gap={16}>
        <span className="brand">Printagram</span>
        <h2 className="h2" style={{ fontSize: 26 }}>
          Choose a new password
        </h2>
        <form className="stack stack-14" onSubmit={submit}>
          <Fieldset>
            <FieldInput
              type="password"
              placeholder="New password (8+ characters)"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="New password"
            />
            <FieldInput
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              aria-label="Repeat password"
            />
          </Fieldset>
          {err && (
            <Banner tone="error" tight>
              {err}
            </Banner>
          )}
          <Button type="submit" block size="xl" disabled={busy}>
            {busy ? 'Saving…' : 'Save and sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
