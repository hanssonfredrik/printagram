import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { ErrorMsg, Loading, PageHead } from '../components';
import { useApi } from '../useApi';

export function Settings({ onSignedOut }: { onSignedOut: () => void }) {
  const { data, error, loading, reload } = useApi<{ vatRatePct: number }>('settings');
  /** null = show the saved value. */
  const [edited, setEdited] = useState<string | null>(null);
  const rate = edited ?? (data ? String(data.vatRatePct) : '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('settings', { method: 'PUT', body: { vatRatePct: Number(rate) } });
      setMsg({ ok: true, text: 'Saved.' });
      setEdited(null);
      reload();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  async function signOutEverywhere() {
    if (!window.confirm('Sign out of the admin in every browser, including this one?')) return;
    await api('auth/logout-all', { method: 'POST', body: {} }).catch(() => undefined);
    onSignedOut();
  }

  return (
    <>
      <PageHead title="Settings" />
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {msg ? <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div> : null}
      <form className="card" onSubmit={save}>
        <h2>VAT</h2>
        <p className="muted">
          Used by the VAT report. Prices are VAT-inclusive. Swedish standard rate is 25 %; e-books
          and some printed matter are 6 %. Confirm which applies with your accountant.
        </p>
        <div className="toolbar">
          <label className="field">
            VAT rate (%)
            <input
              type="number"
              min={0}
              max={50}
              step={0.01}
              required
              value={rate}
              onChange={(e) => setEdited(e.target.value)}
            />
          </label>
          <button className="btn primary">Save</button>
        </div>
      </form>
      <div className="card section">
        <h2>Admin sessions</h2>
        <p className="muted">
          Sessions last 8 hours. Signing out everywhere ends every admin session of your account.
        </p>
        <button className="btn danger" onClick={() => void signOutEverywhere()}>
          Sign out everywhere
        </button>
      </div>
    </>
  );
}
