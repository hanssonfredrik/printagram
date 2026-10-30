import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, qs } from '../api';
import {
  ErrorMsg,
  Loading,
  PageHead,
  Pager,
  RangePicker,
  StatusBadge,
  StatusLegend,
  Tile,
} from '../components';
import {
  bytes,
  dateTime,
  defaultRange,
  money,
  moneySum,
  num,
  SOURCE_LABELS,
  sourceLabel,
  statusLabel,
  stripePaymentUrls,
  type CurrencyCents,
} from '../format';
import { useApi, useQueryState } from '../useApi';

export interface AdminOrder {
  id: string;
  userId: string;
  email: string | null;
  title: string;
  format: string;
  status: string;
  pageCount: number;
  photoCount: number;
  subtotalCents: number;
  discountCents: number;
  promoCode: string | null;
  amountCents: number;
  currency: string;
  paymentProvider: string;
  stripePaymentIntentId: string | null;
  /** From Stripe; null for fake orders and rows from before it was stored. */
  stripeLivemode: boolean | null;
  /** instagram | export | googlephotos, or null when unknown. */
  source: string | null;
  sourceLabel: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  readyAt: string | null;
  pdfVersion: number;
  pdfBytes: number | null;
  pdfPages: number | null;
  hasPdf: boolean;
  shared: boolean;
}

interface OrderList {
  total: number;
  offset: number;
  limit: number;
  totals: {
    count: number;
    /** Rows that are not unpaid checkouts (paid, ready, refunded). */
    orderCount: number;
    /** created or failed: checkout opened, no money taken. */
    unpaidCount: number;
    amountCents: CurrencyCents;
    paidCount: number;
    paidCents: CurrencyCents;
  };
  items: AdminOrder[];
}

const STATUSES = ['', 'created', 'paid', 'ready', 'failed', 'refunded'];

export function Orders() {
  const [params, set] = useQueryState();
  const fallback = defaultRange(90);
  const range = { from: params.get('from') ?? fallback.from, to: params.get('to') ?? fallback.to };
  const status = params.get('status') ?? '';
  const provider = params.get('provider') ?? '';
  const source = params.get('source') ?? '';
  const offset = Number(params.get('offset') ?? 0);
  const [q, setQ] = useState(params.get('q') ?? '');
  const { data, error, loading } = useApi<OrderList>(
    `orders${qs({ ...range, status, provider, source, offset, limit: 100, q: params.get('q') })}`,
  );

  return (
    <>
      <PageHead title="Orders">
        <RangePicker value={range} onChange={(r) => set({ from: r.from, to: r.to })} />
      </PageHead>
      <div className="toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() });
          }}
        >
          <input
            type="search"
            placeholder="Order id, email, promo, PaymentIntent"
            aria-label="Search orders"
            value={q}
            size={32}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => set({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? statusLabel(s) : 'Any status'}
            </option>
          ))}
        </select>
        <select
          aria-label="Provider"
          value={provider}
          onChange={(e) => set({ provider: e.target.value })}
        >
          <option value="">Any provider</option>
          <option value="stripe">Stripe</option>
          <option value="fake">Test (fake)</option>
        </select>
        <select
          aria-label="Source"
          value={source}
          onChange={(e) => set({ source: e.target.value })}
        >
          <option value="">Any source</option>
          {Object.entries(SOURCE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <span className="muted">Dates filter on when the order was created.</span>
      </div>
      <StatusLegend statuses={STATUSES.filter(Boolean)} />
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <>
          <div className="grid tiles">
            <Tile
              label="Orders"
              value={num(data.totals.orderCount)}
              sub="paid, ready or refunded"
            />
            <Tile
              label="Paid or ready"
              value={num(data.totals.paidCount)}
              sub={moneySum(data.totals.paidCents)}
            />
            <Tile
              label="Unpaid checkouts"
              value={num(data.totals.unpaidCount)}
              sub="checkout opened, no money taken"
            />
          </div>
          <div className="card section">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Customer</th>
                    <th>Title</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Promo</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.userId}/${o.id}`}>{dateTime(o.createdAt)}</Link>
                      </td>
                      <td>
                        <Link to={`/users/${o.userId}`}>{o.email ?? 'anonymous'}</Link>
                      </td>
                      <td>{o.title}</td>
                      <td title={o.sourceLabel ?? undefined}>{sourceLabel(o.source)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>{o.paymentProvider}</td>
                      <td>{o.promoCode ?? ''}</td>
                      <td className="num">{money(o.amountCents, o.currency)}</td>
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
        </>
      ) : null}
    </>
  );
}

export function OrderDetail() {
  const { userId = '', orderId = '' } = useParams();
  const { data, error, loading } = useApi<{ order: AdminOrder; bookId: string; libraryId: string }>(
    `orders/${encodeURIComponent(userId)}/${encodeURIComponent(orderId)}`,
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const [stripeTest, setStripeTest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const o = data?.order;
  const paidStripe =
    o?.paymentProvider === 'stripe' &&
    (o.status === 'paid' || o.status === 'ready' || o.status === 'refunded');
  // Stripe itself said it was a test payment: no box needed. Live or unknown: the admin asserts.
  const knownTest = paidStripe && o?.stripeLivemode === false;
  const needsTestBox = paidStripe && !knownTest;

  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDeleteError(null);
    try {
      await api(`orders/${userId}/${orderId}`, {
        method: 'DELETE',
        body: { confirm, stripeTest },
      });
      navigate('/orders', { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message);
      setBusy(false);
    }
  }

  async function openPdf() {
    setPdfError(null);
    try {
      const { url } = await api<{ url: string }>(`orders/${userId}/${orderId}/pdf-url`);
      window.location.assign(url);
    } catch (e) {
      setPdfError((e as Error).message);
    }
  }

  return (
    <>
      <PageHead title={o ? o.title || 'Order' : 'Order'}>
        <Link to="/orders">← Orders</Link>
      </PageHead>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {o ? (
        <div className="grid two">
          <div className="card">
            <h2>Order</h2>
            <dl className="kv">
              <dt>Id</dt>
              <dd className="mono">{o.id}</dd>
              <dt>Customer</dt>
              <dd>
                <Link to={`/users/${o.userId}`}>{o.email ?? o.userId}</Link>
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={o.status} />
                {o.failureReason ? <span className="muted"> {o.failureReason}</span> : null}
              </dd>
              <dt>Created</dt>
              <dd>{dateTime(o.createdAt)}</dd>
              <dt>Paid</dt>
              <dd>{dateTime(o.paidAt)}</dd>
              <dt>Ready</dt>
              <dd>{dateTime(o.readyAt)}</dd>
              <dt>Book</dt>
              <dd>
                {o.format} · {o.pageCount} pages · {o.photoCount} photos
              </dd>
              <dt>Photos from</dt>
              <dd>
                {sourceLabel(o.source)}
                {o.sourceLabel ? <span className="muted"> ({o.sourceLabel})</span> : null}
              </dd>
              <dt>PDF</dt>
              <dd>
                {o.hasPdf ? (
                  <>
                    v{o.pdfVersion} · {o.pdfPages ?? '?'} pages · {bytes(o.pdfBytes)}{' '}
                    <button className="btn" type="button" onClick={() => void openPdf()}>
                      Download
                    </button>
                  </>
                ) : (
                  'not generated'
                )}
              </dd>
              <dt>Share link</dt>
              <dd>{o.shared ? 'active' : 'none'}</dd>
            </dl>
            <ErrorMsg error={pdfError} />
          </div>
          <div className="card">
            <h2>Payment</h2>
            <dl className="kv">
              <dt>Subtotal</dt>
              <dd>{money(o.subtotalCents, o.currency)}</dd>
              <dt>Discount</dt>
              <dd>
                {money(o.discountCents, o.currency)}
                {o.promoCode ? ` (${o.promoCode})` : ''}
              </dd>
              <dt>Amount</dt>
              <dd>
                <b>{money(o.amountCents, o.currency)}</b> incl. VAT
              </dd>
              <dt>Provider</dt>
              <dd>{o.paymentProvider === 'fake' ? 'Test payments (no money taken)' : 'Stripe'}</dd>
              <dt>{o.paymentProvider === 'fake' ? 'Reference' : 'PaymentIntent'}</dt>
              <dd>
                {!o.stripePaymentIntentId ? (
                  '–'
                ) : o.paymentProvider === 'fake' ? (
                  <>
                    <span className="mono">{o.stripePaymentIntentId}</span>
                    <div className="muted">Test payment, no Stripe record.</div>
                  </>
                ) : (
                  <>
                    <span className="mono">{o.stripePaymentIntentId}</span>
                    <br />
                    {stripePaymentUrls(o.stripePaymentIntentId, o.stripeLivemode).map((link, i) => (
                      <span key={link.href}>
                        {i > 0 ? ' · ' : ''}
                        <a href={link.href} target="_blank" rel="noreferrer noopener">
                          {link.label}
                        </a>
                      </span>
                    ))}
                    {o.stripeLivemode === null ? (
                      <div className="muted">
                        Stripe has not told us yet whether this was a live or a test payment, so
                        both links are shown.
                      </div>
                    ) : null}
                  </>
                )}
              </dd>
            </dl>
            <p className="muted">
              Refunds are made in the Stripe dashboard; the webhook then marks the order refunded.
            </p>
          </div>
        </div>
      ) : null}
      {o ? (
        <form className="card section danger-zone" onSubmit={remove}>
          <h2>Delete order</h2>
          <p className="muted">
            For test orders. Deletes the order, its PDF and share link, and gives back a used promo
            code. The book becomes a draft again. Payment records at Stripe are not affected. This
            cannot be undone.
          </p>
          {knownTest ? <p className="muted">Stripe recorded this as a test-mode payment.</p> : null}
          {needsTestBox ? (
            <label className="toolbar">
              <input
                type="checkbox"
                checked={stripeTest}
                onChange={(e) => setStripeTest(e.target.checked)}
              />
              {o.stripeLivemode === true
                ? 'Stripe recorded this as a live payment. Only tick this if you are sure no real money was taken. Real paid orders must be kept for the accounts.'
                : 'This was a Stripe test-mode payment. Real paid orders must be kept for the accounts.'}
            </label>
          ) : null}
          <div className="toolbar">
            <input
              aria-label="Confirm"
              placeholder={`Type ${o.id} to confirm`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              size={36}
            />
            <button
              className="btn danger"
              disabled={busy || confirm !== o.id || (needsTestBox && !stripeTest)}
            >
              Delete order permanently
            </button>
          </div>
          <ErrorMsg error={deleteError} />
        </form>
      ) : null}
    </>
  );
}
