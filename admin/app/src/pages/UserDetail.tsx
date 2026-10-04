import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import { ErrorMsg, Loading, PageHead, StatusBadge } from '../components';
import { ago, date, dateTime, money } from '../format';
import { useApi } from '../useApi';
import type { AdminUser } from './Users';
import type { AdminOrder } from './Orders';

interface Detail {
  user: AdminUser;
  libraries: {
    id: string;
    source: string;
    status: string;
    photoCount: number;
    sourceLabel: string;
    importedAt: string;
    expiresAt: string;
    igUsername: string | null;
  }[];
  books: {
    id: string;
    title: string;
    status: string;
    pageCount: number;
    photoCount: number;
    updatedAt: string;
  }[];
  orders: AdminOrder[];
}

export function UserDetail({ me }: { me: string }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<Detail>(`users/${encodeURIComponent(id)}`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const u = data?.user;
  const isMe = u?.id === me;

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const patch = (body: Record<string, unknown>, ok: string) =>
    act(() => api(`users/${id}`, { method: 'PATCH', body }), ok);

  function saveEmail(e: FormEvent) {
    e.preventDefault();
    if (email === null) return;
    void patch({ email }, 'Email updated.').then(() => setEmail(null));
  }

  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api(`users/${id}`, { method: 'DELETE', body: { confirm } });
      navigate('/users', { replace: true });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={u?.email ?? 'User'}>
        <Link to="/users">← Users</Link>
      </PageHead>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {msg ? <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div> : null}
      {u && data ? (
        <>
          <div className="grid two">
            <div className="card">
              <h2>Account</h2>
              <dl className="kv">
                <dt>Id</dt>
                <dd className="mono">{u.id}</dd>
                <dt>Email</dt>
                <dd>
                  {email === null ? (
                    <>
                      {u.email ?? '–'}{' '}
                      <button className="btn" type="button" onClick={() => setEmail(u.email ?? '')}>
                        Change
                      </button>
                    </>
                  ) : (
                    <form className="toolbar" onSubmit={saveEmail}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <button className="btn primary" disabled={busy}>
                        Save
                      </button>
                      <button className="btn" type="button" onClick={() => setEmail(null)}>
                        Cancel
                      </button>
                    </form>
                  )}
                </dd>
                <dt>Type</dt>
                <dd>
                  {u.authLevel}
                  {u.hasPassword ? '' : ' (no password)'}
                </dd>
                <dt>Status</dt>
                <dd>{u.status}</dd>
                <dt>Language</dt>
                <dd>
                  <select
                    aria-label="Language"
                    value={u.lang ?? ''}
                    disabled={busy}
                    onChange={(e) => void patch({ lang: e.target.value }, 'Language updated.')}
                  >
                    {u.lang ? null : <option value="">–</option>}
                    <option value="en">English</option>
                    <option value="sv">Svenska</option>
                  </select>
                </dd>
                <dt>Created</dt>
                <dd>{dateTime(u.createdAt)}</dd>
                <dt>Last seen</dt>
                <dd>
                  {dateTime(u.lastSeenAt)} ({ago(u.lastSeenAt)})
                </dd>
              </dl>
            </div>

            <div className="card">
              <h2>Access</h2>
              <dl className="kv">
                <dt>Admin</dt>
                <dd>
                  {u.isAdmin ? <span className="badge info">admin</span> : 'no'}
                  {u.isAdmin
                    ? u.mfaEnrolled
                      ? ' · authenticator set up'
                      : ' · authenticator not set up yet'
                    : ''}
                </dd>
              </dl>
              <div className="toolbar section">
                {isMe ? (
                  <span className="muted">
                    This is you. Your own admin access can only be changed from another admin or
                    scripts/admin.ts.
                  </span>
                ) : (
                  <>
                    <button
                      className={`btn ${u.isAdmin ? 'danger' : ''}`}
                      disabled={busy || (!u.isAdmin && !u.hasPassword)}
                      onClick={() =>
                        window.confirm(
                          u.isAdmin
                            ? `Remove admin access from ${u.email}?`
                            : `Give ${u.email} full admin access? They will set up an authenticator at first sign-in.`,
                        ) &&
                        void patch(
                          { isAdmin: !u.isAdmin },
                          u.isAdmin ? 'Admin access removed.' : 'Admin access granted.',
                        )
                      }
                    >
                      {u.isAdmin ? 'Remove admin access' : 'Make admin'}
                    </button>
                    {u.isAdmin && u.mfaEnrolled ? (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(
                            `Reset ${u.email}'s authenticator? They set it up again at next sign-in.`,
                          ) &&
                          void act(
                            () => api(`users/${id}/reset-mfa`, { method: 'POST', body: {} }),
                            'Authenticator reset.',
                          )
                        }
                      >
                        Reset authenticator
                      </button>
                    ) : null}
                  </>
                )}
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    window.confirm('Sign this user out of inbunden.com on every device?') &&
                    void act(
                      () => api(`users/${id}/logout-all`, { method: 'POST', body: {} }),
                      'Signed out everywhere.',
                    )
                  }
                >
                  Sign out of the site everywhere
                </button>
              </div>
            </div>
          </div>

          <div className="card section">
            <h2>Orders ({data.orders.length})</h2>
            {data.orders.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Provider</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/orders/${o.userId}/${o.id}`}>{dateTime(o.createdAt)}</Link>
                        </td>
                        <td>{o.title}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td>{o.paymentProvider}</td>
                        <td className="num">{money(o.amountCents, o.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No orders.</p>
            )}
          </div>

          <div className="grid two section">
            <div className="card">
              <h2>Libraries ({data.libraries.length})</h2>
              {data.libraries.length ? (
                <table>
                  <tbody>
                    {data.libraries.map((l) => (
                      <tr key={l.id}>
                        <td>
                          {l.sourceLabel || l.source}
                          {l.igUsername ? ` (@${l.igUsername})` : ''}
                          <div className="muted">
                            {l.source} · imported {date(l.importedAt)} · expires {date(l.expiresAt)}
                          </div>
                        </td>
                        <td>{l.status}</td>
                        <td className="num">{l.photoCount} photos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No libraries.</p>
              )}
            </div>
            <div className="card">
              <h2>Books ({data.books.length})</h2>
              {data.books.length ? (
                <table>
                  <tbody>
                    {data.books.map((b) => (
                      <tr key={b.id}>
                        <td>
                          {b.title || 'Untitled'}
                          <div className="muted">updated {date(b.updatedAt)}</div>
                        </td>
                        <td>{b.status}</td>
                        <td className="num">
                          {b.pageCount} p · {b.photoCount} photos
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No books.</p>
              )}
            </div>
          </div>

          {!isMe ? (
            <form className="card section danger-zone" onSubmit={remove}>
              <h2>Delete user</h2>
              <p className="muted">
                Permanently deletes the account, photos, books, orders, PDFs and share links.
                Payment records at Stripe are not affected. This cannot be undone.
              </p>
              <div className="toolbar">
                <input
                  aria-label="Confirm"
                  placeholder={`Type ${u.email ?? u.id} to confirm`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  size={36}
                />
                <button className="btn danger" disabled={busy || confirm !== (u.email ?? u.id)}>
                  Delete user permanently
                </button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </>
  );
}
