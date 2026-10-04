import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { ErrorMsg, Loading, PageHead } from '../components';
import { date, money } from '../format';
import { useApi } from '../useApi';

interface Promo {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  /** Currency of a fixed amount; missing means euros. */
  currency?: 'eur' | 'sek';
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  perUserOnce: boolean;
  active: boolean;
}

const blank = {
  code: '',
  type: 'percent',
  value: '',
  currency: 'eur',
  validUntil: '',
  maxRedemptions: '',
  perUserOnce: false,
};

export function Promos() {
  const { data, error, loading, reload } = useApi<{ items: Promo[] }>('promos');
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      reload();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const value = form.type === 'fixed' ? Math.round(Number(form.value) * 100) : Number(form.value);
    const ok = await run(
      () =>
        api('promos', {
          method: 'POST',
          body: {
            code: form.code,
            type: form.type,
            value,
            currency: form.type === 'fixed' ? form.currency : undefined,
            validUntil: form.validUntil || null,
            maxRedemptions: form.maxRedemptions || null,
            perUserOnce: form.perUserOnce,
          },
        }),
      `Created ${form.code.toUpperCase()}.`,
    );
    if (ok) setForm(blank);
  }

  return (
    <>
      <PageHead title="Promo codes" />
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {msg ? <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div> : null}
      {data ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Used</th>
                  <th>Rules</th>
                  <th>Valid until</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.code}>
                    <td className="mono">{p.code}</td>
                    <td>{p.type === 'percent' ? `${p.value} %` : money(p.value, p.currency)}</td>
                    <td>
                      {p.redemptions}
                      {p.maxRedemptions !== null ? ` / ${p.maxRedemptions}` : ''}
                    </td>
                    <td>{p.perUserOnce ? 'once per user' : ''}</td>
                    <td>{p.validUntil ? date(p.validUntil) : '–'}</td>
                    <td>
                      <span className={`badge ${p.active ? 'ok' : ''}`}>
                        {p.active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              api(`promos/${encodeURIComponent(p.code)}`, {
                                method: 'PATCH',
                                body: { active: !p.active },
                              }),
                            `${p.code} ${p.active ? 'disabled' : 'enabled'}.`,
                          )
                        }
                      >
                        {p.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No codes yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <form className="card section" onSubmit={create}>
        <h2>New code</h2>
        <div className="toolbar">
          <label className="field">
            Code
            <input
              required
              pattern="[A-Za-z0-9_\-]{3,32}"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label className="field">
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          {form.type === 'fixed' ? (
            <label className="field">
              Currency
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="eur">€ (English site)</option>
                <option value="sek">kr (Swedish site)</option>
              </select>
            </label>
          ) : null}
          <label className="field">
            {form.type === 'percent'
              ? 'Percent (1–100)'
              : `Amount in ${form.currency === 'sek' ? 'kr' : '€'}`}
            <input
              required
              type="number"
              min={form.type === 'percent' ? 1 : 0.01}
              max={form.type === 'percent' ? 100 : undefined}
              step={form.type === 'percent' ? 1 : 0.01}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </label>
          <label className="field">
            Valid until (optional)
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
            />
          </label>
          <label className="field">
            Max uses (optional)
            <input
              type="number"
              min={1}
              step={1}
              value={form.maxRedemptions}
              onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.perUserOnce}
              onChange={(e) => setForm({ ...form, perUserOnce: e.target.checked })}
            />
            Once per user
          </label>
          <button className="btn primary" disabled={busy}>
            Create
          </button>
        </div>
      </form>
    </>
  );
}
