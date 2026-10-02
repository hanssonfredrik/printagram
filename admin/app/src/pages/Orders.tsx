import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, qs } from '../api';
import { ErrorMsg, Loading, PageHead, Pager, RangePicker, StatusBadge, Tile } from '../components';
import { bytes, dateTime, defaultRange, eur, num } from '../format';
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
  totals: { count: number; amountCents: number; paidCount: number; paidCents: number };
  items: AdminOrder[];
}

const STATUSES = ['', 'created', 'paid', 'ready', 'failed', 'expired', 'refunded'];

export function Orders() {
  const [params, set] = useQueryState();
  const fallback = defaultRange(90);
  const range = { from: params.get('from') ?? fallback.from, to: params.get('to') ?? fallback.to };
  const status = params.get('status') ?? '';
  const provider = params.get('provider') ?? '';
  const offset = Number(params.get('offset') ?? 0);
  const [q, setQ] = useState(params.get('q') ?? '');
  const { data, error, loading } = useApi<OrderList>(
    `orders${qs({ ...range, status, provider, offset, limit: 100, q: params.get('q') })}`,
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
              {s || 'Any status'}
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
        <span className="muted">Dates filter on when the order was created.</span>
      </div>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <>
          <div className="grid tiles">
            <Tile label="Orders" value={num(data.totals.count)} />
            <Tile
              label="Paid or ready"
              value={num(data.totals.paidCount)}
              sub={eur(data.totals.paidCents)}
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
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>{o.paymentProvider}</td>
                      <td>{o.promoCode ?? ''}</td>
                      <td className="num">{eur(o.amountCents)}</td>
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
  const o = data?.order;

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
              <dd>{eur(o.subtotalCents)}</dd>
              <dt>Discount</dt>
              <dd>
                {eur(o.discountCents)}
                {o.promoCode ? ` (${o.promoCode})` : ''}
              </dd>
              <dt>Amount</dt>
              <dd>
                <b>{eur(o.amountCents)}</b> incl. VAT
              </dd>
              <dt>Provider</dt>
              <dd>{o.paymentProvider === 'fake' ? 'Test payments (no money taken)' : 'Stripe'}</dd>
              <dt>PaymentIntent</dt>
              <dd>
                {o.stripePaymentIntentId ? (
                  <>
                    <span className="mono">{o.stripePaymentIntentId}</span>
                    <br />
                    <a
                      href={`https://dashboard.stripe.com/payments/${encodeURIComponent(o.stripePaymentIntentId)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Open in Stripe
                    </a>{' '}
                    ·{' '}
                    <a
                      href={`https://dashboard.stripe.com/test/payments/${encodeURIComponent(o.stripePaymentIntentId)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      (test mode)
                    </a>
                  </>
                ) : (
                  '–'
                )}
              </dd>
            </dl>
            <p className="muted">
              Refunds are made in the Stripe dashboard; the webhook then marks the order refunded.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
