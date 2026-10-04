import { useState } from 'react';
import { Link } from 'react-router';
import { qs } from '../api';
import { ErrorMsg, Loading, PageHead, Tile } from '../components';
import { download, money, num, toCsv } from '../format';
import { useApi } from '../useApi';

interface Totals {
  count: number;
  grossCents: number;
  vatCents: number;
  netCents: number;
}

interface VatReport {
  from: string;
  to: string;
  provider: string;
  currency: 'eur' | 'sek';
  ratePct: number;
  sales: Totals;
  refunded: Totals;
  byMonth: (Totals & { month: string })[];
  rows: {
    paidAt: string;
    orderId: string;
    email: string | null;
    status: string;
    provider: string;
    promoCode: string | null;
    subtotalCents: number;
    discountCents: number;
    grossCents: number;
    vatCents: number;
    netCents: number;
    stripePaymentIntentId: string | null;
  }[];
}

type Kind = 'month' | 'quarter' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Period → inclusive [from, to]. `m` is 1-based; for quarters it is the quarter (1–4). */
function periodRange(
  kind: Kind,
  y: number,
  m: number,
): { from: string; to: string; label: string } {
  if (kind === 'year') return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  if (kind === 'quarter') {
    const first = (m - 1) * 3 + 1;
    return {
      from: `${y}-${pad(first)}-01`,
      to: `${y}-${pad(first + 2)}-${lastDay(y, first + 2)}`,
      label: `${y}-Q${m}`,
    };
  }
  return {
    from: `${y}-${pad(m)}-01`,
    to: `${y}-${pad(m)}-${lastDay(y, m)}`,
    label: `${y}-${pad(m)}`,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Vat() {
  const now = new Date();
  const [kind, setKind] = useState<Kind>('quarter');
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getUTCMonth() / 3) + 1);
  const [provider, setProvider] = useState('stripe');
  const [currency, setCurrency] = useState<'eur' | 'sek'>('eur');
  const period = periodRange(kind, year, kind === 'quarter' ? quarter : month);
  const { data, error, loading } = useApi<VatReport>(
    `reports/vat${qs({ from: period.from, to: period.to, provider, currency })}`,
  );
  const years = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - i);

  function exportCsv() {
    if (!data) return;
    const e = (c: number) => (c / 100).toFixed(2);
    const cur = data.currency.toUpperCase();
    download(
      `inbunden-vat-${period.label}-${provider}-${data.currency}.csv`,
      toCsv([
        [
          'Paid at (UTC)',
          'Order id',
          'Customer',
          'Status',
          'Provider',
          'Promo',
          `Subtotal ${cur}`,
          `Discount ${cur}`,
          `Gross ${cur}`,
          `VAT ${data.ratePct}% ${cur}`,
          `Net ${cur}`,
          'Stripe PaymentIntent',
        ],
        ...data.rows.map((r) => [
          r.paidAt,
          r.orderId,
          r.email,
          r.status,
          r.provider,
          r.promoCode,
          e(r.subtotalCents),
          e(r.discountCents),
          e(r.grossCents),
          e(r.vatCents),
          e(r.netCents),
          r.stripePaymentIntentId,
        ]),
        [],
        [
          'Sales (paid/ready)',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          e(data.sales.grossCents),
          e(data.sales.vatCents),
          e(data.sales.netCents),
          `${data.sales.count} orders`,
        ],
        [
          'Refunded',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          e(data.refunded.grossCents),
          e(data.refunded.vatCents),
          e(data.refunded.netCents),
          `${data.refunded.count} orders`,
        ],
      ]),
    );
  }

  return (
    <>
      <PageHead title="VAT report">
        <button className="btn" disabled={!data} onClick={exportCsv}>
          Export CSV
        </button>
      </PageHead>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Period type">
          {(['month', 'quarter', 'year'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'on' : ''}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        {kind === 'month' ? (
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        ) : null}
        {kind === 'quarter' ? (
          <select
            aria-label="Quarter"
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="stripe">Stripe (real payments)</option>
          <option value="fake">Test payments</option>
          <option value="all">All</option>
        </select>
        <div className="seg" role="group" aria-label="Currency">
          {(['eur', 'sek'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={currency === c ? 'on' : ''}
              onClick={() => setCurrency(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="muted">
          {period.from} – {period.to}
        </span>
      </div>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <>
          <div className="grid tiles">
            <Tile
              label="Sales incl. VAT"
              value={money(data.sales.grossCents, data.currency)}
              sub={`${num(data.sales.count)} orders`}
            />
            <Tile
              label={`Output VAT (${data.ratePct} %)`}
              value={money(data.sales.vatCents, data.currency)}
            />
            <Tile label="Net sales" value={money(data.sales.netCents, data.currency)} />
            <Tile
              label="Refunded"
              value={money(data.refunded.grossCents, data.currency)}
              sub={`${num(data.refunded.count)} orders · VAT ${money(data.refunded.vatCents, data.currency)}`}
            />
          </div>

          <div className="card section">
            <h2>By month</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Orders</th>
                    <th className="num">Gross</th>
                    <th className="num">VAT</th>
                    <th className="num">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byMonth.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td className="num">{num(m.count)}</td>
                      <td className="num">{money(m.grossCents, data.currency)}</td>
                      <td className="num">{money(m.vatCents, data.currency)}</td>
                      <td className="num">{money(m.netCents, data.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{num(data.sales.count)}</td>
                    <td className="num">{money(data.sales.grossCents, data.currency)}</td>
                    <td className="num">{money(data.sales.vatCents, data.currency)}</td>
                    <td className="num">{money(data.sales.netCents, data.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="msg warn section">
            Prices are VAT-inclusive; VAT = gross × {data.ratePct} / (100 + {data.ratePct}), rounded
            per order. The rate is set under <Link to="/settings">Settings</Link>. Orders are
            counted on the payment date. Refunded orders paid in this period are shown apart because
            refund dates are not stored here; check them against Stripe. Customer country is not
            recorded, so sales to other EU countries (OSS) cannot be split out yet. Each currency is
            reported on its own: SEK orders come from the Swedish site, EUR orders from the English
            one. Confirm the rate and treatment with your accountant.
          </div>
        </>
      ) : null}
    </>
  );
}
