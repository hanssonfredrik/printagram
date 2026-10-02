import { useState } from 'react';
import { qs } from '../api';
import { ErrorMsg, Loading, PageHead } from '../components';
import { dateTime } from '../format';
import { useApi } from '../useApi';

interface AuditRow {
  auditId: string;
  at: string;
  actorEmail: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  ok: boolean;
}

export function Audit() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, error, loading } = useApi<{ items: AuditRow[] }>(`audit${qs({ month })}`);

  return (
    <>
      <PageHead title="Audit log">
        <input
          type="month"
          aria-label="Month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
      </PageHead>
      <p className="muted">
        Every sign-in attempt and every change made in the admin, newest first.
      </p>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Detail</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.auditId}>
                    <td>{dateTime(r.at)}</td>
                    <td>{r.actorEmail ?? '–'}</td>
                    <td>
                      {r.action} {r.ok ? null : <span className="badge bad">failed</span>}
                    </td>
                    <td className="mono">{r.target ?? ''}</td>
                    <td>{r.detail ?? ''}</td>
                    <td className="mono">{r.ip ?? ''}</td>
                  </tr>
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      Nothing logged this month.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
