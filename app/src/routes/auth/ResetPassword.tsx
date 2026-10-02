import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Banner, Button, Card, FieldInput, Fieldset } from '@/components/ui';
import { api } from '@/services';
import { useSession } from '@/state/session';
import { errorText, useT } from '@/i18n';

export function ResetPassword() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const t = useT();
  const tr = t.auth.reset;
  const setUser = useSession((x) => x.setUser);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErr(tr.tooShort);
    if (password !== again) return setErr(tr.mismatch);
    setBusy(true);
    setErr(null);
    try {
      setUser(await api.resetPassword(token, password));
      nav('/books', { replace: true });
    } catch (e2) {
      setErr(errorText(e2, t, { NOT_FOUND: t.auth.linkInvalid }));
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
        <h2 className="h2" style={{ fontSize: 26 }}>
          {tr.title}
        </h2>
        <form className="stack stack-14" onSubmit={submit}>
          <Fieldset>
            <FieldInput
              type="password"
              placeholder={tr.newPlaceholder}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label={tr.newLabel}
            />
            <FieldInput
              type="password"
              placeholder={tr.repeat}
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              aria-label={tr.repeat}
            />
          </Fieldset>
          {err && (
            <Banner tone="error" tight>
              {err}
            </Banner>
          )}
          <Button type="submit" block size="xl" disabled={busy}>
            {busy ? tr.busy : tr.submit}
          </Button>
        </form>
      </Card>
    </div>
  );
}
