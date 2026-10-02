import { useState } from 'react';
import { Link } from 'react-router';
import { qs } from '../api';
import {
  BarList,
  ColumnChart,
  ErrorMsg,
  Loading,
  PageHead,
  RangePicker,
  StatusBadge,
  Tile,
} from '../components';
import { compact, defaultRange, eur, num, pct, type Range } from '../format';
import { useApi } from '../useApi';

interface Overview {
  users: {
    registered: number;
    anonymous: number;
    admins: number;
    active7: number;
    active30: number;
    signupsInRange: number;
    payers: number;
  };
  orders: {
    byStatus: Record<string, number>;
    paidInRange: { count: number; stripeCents: number; fakeCents: number };
  };
  libraries: { active: number; photos: number; expired: number };
  visits: {
    views: number;
    visitors: number;
    topPaths: { key: string; views: number; visitors: number }[];
  };
  byDay: {
    day: string;
    signups: number;
    orders: number;
    stripeCents: number;
    fakeCents: number;
    views: number;
    visitors: number;
  }[];
}

export function Dashboard() {
  const [range, setRange] = useState<Range>(defaultRange(30));
  const { data, error, loading } = useApi<Overview>(`stats/overview${qs({ ...range })}`);
  const paid = data?.orders.paidInRange;

  return (
    <>
      <PageHead title="Dashboard">
        <RangePicker value={range} onChange={setRange} />
      </PageHead>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data && paid ? (
        <>
          <div className="grid tiles">
            <Tile
              label="Revenue (Stripe)"
              value={eur(paid.stripeCents)}
              sub={paid.fakeCents ? `+ ${eur(paid.fakeCents)} test payments` : 'in range'}
            />
            <Tile label="Paid orders" value={num(paid.count)} sub="in range" />
            <Tile
              label="Visitors"
              value={compact(data.visits.visitors)}
              sub={`${compact(data.visits.views)} page views`}
            />
            <Tile label="New accounts" value={num(data.users.signupsInRange)} sub="in range" />
            <Tile
              label="Accounts"
              value={num(data.users.registered)}
              sub={`${num(data.users.anonymous)} anonymous sessions`}
            />
            <Tile
              label="Active accounts"
              value={num(data.users.active30)}
              sub={`${num(data.users.active7)} in the last 7 days`}
            />
            <Tile
              label="Paying customers"
              value={num(data.users.payers)}
              sub={
                data.users.registered
                  ? `${pct(data.users.payers / data.users.registered)} of accounts`
                  : undefined
              }
            />
            <Tile
              label="Libraries kept"
              value={num(data.libraries.active)}
              sub={`${compact(data.libraries.photos)} photos stored`}
            />
          </div>

          <div className="grid two section">
            <div className="card">
              <h2>Revenue per day (Stripe)</h2>
              <ColumnChart
                label="Revenue per day from Stripe payments"
                data={data.byDay.map((d) => ({ key: d.day, value: d.stripeCents }))}
                format={(v) => eur(v).replace(/,00\s/, ' ')}
              />
            </div>
            <div className="card">
              <h2>Visitors per day</h2>
              <ColumnChart
                label="Unique visitors per day"
                data={data.byDay.map((d) => ({ key: d.day, value: d.visitors }))}
                format={compact}
              />
            </div>
            <div className="card">
              <h2>Paid orders per day</h2>
              <ColumnChart
                label="Paid orders per day"
                data={data.byDay.map((d) => ({ key: d.day, value: d.orders }))}
                format={compact}
              />
            </div>
            <div className="card">
              <h2>New accounts per day</h2>
              <ColumnChart
                label="New accounts per day"
                data={data.byDay.map((d) => ({ key: d.day, value: d.signups }))}
                format={compact}
              />
            </div>
          </div>

          <div className="grid two section">
            <div className="card">
              <h2>Orders by status (all time)</h2>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {Object.entries(data.orders.byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([s, n]) => (
                        <tr key={s}>
                          <td>
                            <Link to={`/orders?status=${s}`}>
                              <StatusBadge status={s} />
                            </Link>
                          </td>
                          <td className="num">{num(n)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h2>Top pages</h2>
              <BarList rows={data.visits.topPaths} />
              <p className="muted">
                <Link to="/visitors">All visitor stats →</Link>
              </p>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
