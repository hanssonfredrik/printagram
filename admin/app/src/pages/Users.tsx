import { useState } from 'react';
import { Link } from 'react-router';
import { qs } from '../api';
import { ErrorMsg, Loading, PageHead, Pager } from '../components';
import { ago, date, eur } from '../format';
import { useApi, useQueryState } from '../useApi';

export interface AdminUser {
  id: string;
  email: string | null;
  authLevel: string;
  status: string;
  lang: string | null;
  createdAt: string;
  lastSeenAt: string;
  isAdmin: boolean;
  mfaEnrolled: boolean;
  hasPassword: boolean;
}

interface UserList {
  total: number;
  offset: number;
  limit: number;
  items: (AdminUser & { paidOrders: number; paidCents: number })[];
}

const TYPES = ['registered', 'anonymous', 'admin', 'all'] as const;

export function Users() {
  const [params, set] = useQueryState();
  const type = params.get('type') ?? 'registered';
  const sort = params.get('sort') ?? 'created';
  const offset = Number(params.get('offset') ?? 0);
  const [q, setQ] = useState(params.get('q') ?? '');
  const { data, error, loading } = useApi<UserList>(
    `users${qs({ type, sort, offset, limit: 50, q: params.get('q') })}`,
  );

  return (
    <>
      <PageHead title="Users" />
      <div className="toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() });
          }}
        >
          <input
            type="search"
            placeholder="Search email or id"
            aria-label="Search users"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="seg" role="group" aria-label="User type">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={type === t ? 'on' : ''}
              onClick={() => set({ type: t })}
            >
              {t}
            </button>
          ))}
        </div>
        <select aria-label="Sort" value={sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="created">Newest first</option>
          <option value="seen">Last seen</option>
        </select>
      </div>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Last seen</th>
                  <th className="num">Paid orders</th>
                  <th className="num">Paid</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link to={`/users/${u.id}`}>
                        {u.email ?? <span className="mono">{u.id}</span>}
                      </Link>{' '}
                      {u.isAdmin ? <span className="badge info">admin</span> : null}
                      {u.status !== 'active' ? <span className="badge bad">{u.status}</span> : null}
                    </td>
                    <td>{u.authLevel}</td>
                    <td>{date(u.createdAt)}</td>
                    <td title={u.lastSeenAt}>{ago(u.lastSeenAt)}</td>
                    <td className="num">{u.paidOrders}</td>
                    <td className="num">{eur(u.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            total={data.total}
            offset={data.offset}
            limit={data.limit}
            onChange={(o) => set({ offset: String(o) })}
          />
        </div>
      ) : null}
    </>
  );
}
