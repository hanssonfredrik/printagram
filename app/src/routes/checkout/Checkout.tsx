import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Order, PaymentProviderName } from '@printagram/shared';
import { fmtEuro, price } from '@printagram/shared';
import {
  Banner,
  Button,
  Card,
  FieldInput,
  Fieldset,
  Input,
  Label,
  Pill,
  Spinner,
} from '@/components/ui';
import { CoverThumb } from '@/components/PageRenderer';
import { ApiClientError, api } from '@/services';
import { useDraft } from '@/state/draft';
import { saveCurrentDraft, useBook } from '@/state/useBook';
import { useConfig, useSession } from '@/state/session';
import { FakePayment } from './FakePayment';
import s from './checkout.module.css';

const StripeBox = lazy(() => import('./StripeBox'));

type PayState = 'idle' | 'processing' | 'error';

export function Checkout() {
  const nav = useNavigate();
  const cfg = useConfig();
  const d = useDraft();
  const book = useBook();
  const user = useSession((x) => x.user);
  const setUser = useSession((x) => x.setUser);
  const ensureSession = useSession((x) => x.ensureSession);

  const [order, setOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProviderName | null>(null);
  const [pay, setPay] = useState<PayState>('idle');
  const [payMsg, setPayMsg] = useState('');
  const [password, setPassword] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const creating = useRef(false);

  const hasAccount = user?.authLevel === 'password';
  // Until the server answers, show the locally computed price; afterwards the order is the truth.
  const local = price(book.total, cfg.pricing);
  const subtotal = order?.subtotalCents ?? local.totalCents;
  const discount = order?.discountCents ?? 0;
  const total = order?.amountCents ?? local.totalCents;

  // Make sure the draft is saved and an order is open for it (reused while the book is unchanged).
  useEffect(() => {
    if (!book.ready || book.chosen.length === 0 || !book.libraryId || creating.current) return;
    creating.current = true;
    (async () => {
      try {
        await ensureSession();
        const bookId = await saveCurrentDraft(book);
        const res = await api.createOrder(bookId);
        setOrder(res.order);
        setClientSecret(res.clientSecret);
        setProvider(res.provider);
        if (res.order.promoCode) setPromoOpen(true);
        if (res.order.status === 'failed' && res.order.failureReason) {
          setPay('error');
          setPayMsg(res.order.failureReason);
        }
      } catch (e) {
        setPay('error');
        setPayMsg(e instanceof Error ? e.message : 'Could not start checkout.');
      } finally {
        creating.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.ready, book.libraryId]);

  useEffect(() => {
    if (book.ready && book.chosen.length === 0) nav('/select', { replace: true });
  }, [book.ready, book.chosen.length, nav]);

  const clearError = () => {
    if (pay === 'error') setPay('idle');
  };

  /** Creates the account (or verifies the fields) before any payment is confirmed. */
  const ensureAccount = useCallback(async (): Promise<boolean> => {
    if (hasAccount) return true;
    if (!d.email.includes('@')) {
      setPay('error');
      setPayMsg('Please enter an email address so we can send your download link.');
      return false;
    }
    if (password.length < 8) {
      setPay('error');
      setPayMsg('Please choose a password of at least 8 characters for your account.');
      return false;
    }
    try {
      const u = await api.register(d.email, password);
      setUser(u);
      return true;
    } catch (e) {
      setPay('error');
      if (e instanceof ApiClientError && e.code === 'EMAIL_TAKEN') {
        setPayMsg(
          'That email already has a Printagram account. Sign in to continue with this book.',
        );
      } else {
        setPayMsg(e instanceof Error ? e.message : 'Could not create your account.');
      }
      return false;
    }
  }, [d.email, hasAccount, password, setUser]);

  const finishPaid = (o: Order) => {
    d.setLastOrderId(o.id);
    nav(`/done/${o.id}`);
  };

  const run = async (fn: () => Promise<Order>) => {
    if (!order || pay === 'processing') return;
    if (!(await ensureAccount())) return;
    setPay('processing');
    try {
      finishPaid(await fn());
    } catch (e) {
      setPay('error');
      setPayMsg(e instanceof Error ? e.message : 'Payment failed.');
    }
  };

  const applyPromo = async (code: string) => {
    if (!order) return;
    setPromoBusy(true);
    setPromoMsg(null);
    try {
      const res = await api.applyPromo(order.id, code);
      setOrder(res.order);
      if (res.clientSecret) setClientSecret(res.clientSecret);
      if (res.rejected) setPromoMsg(res.rejected.reason);
      else setPromoInput('');
    } catch (e) {
      setPromoMsg(e instanceof Error ? e.message : 'Could not apply the code.');
    } finally {
      setPromoBusy(false);
    }
  };

  const promo = (
    <div className="stack stack-8">
      {order?.promoCode ? (
        <div className={s.promoApplied}>
          <span>
            Code <strong>{order.promoCode}</strong> applied · −{fmtEuro(discount)}
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => applyPromo('')}
            disabled={promoBusy}
          >
            Remove
          </button>
        </div>
      ) : promoOpen ? (
        <form
          className={s.promoRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (promoInput.trim()) void applyPromo(promoInput);
          }}
        >
          <Input
            placeholder="Discount code"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoMsg(null);
            }}
            aria-label="Discount code"
            autoCapitalize="characters"
            style={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={promoBusy || !order || !promoInput.trim()}
          >
            {promoBusy ? 'Checking…' : 'Apply'}
          </Button>
        </form>
      ) : (
        <button
          type="button"
          className="link-button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setPromoOpen(true)}
        >
          Have a discount code?
        </button>
      )}
      {promoMsg && (
        <div className="tiny" role="alert" style={{ color: 'var(--error-text)' }}>
          {promoMsg}
        </div>
      )}
    </div>
  );

  const summary = (
    <Card bordered pad="wide" gap={14} style={{ padding: 20 }}>
      <div className="row gap-14">
        <CoverThumb src={book.cover?.thumbUrl} format={d.format} width={64} />
        <div>
          <div className="serif" style={{ fontSize: 18 }}>
            {d.title}
          </div>
          <div className="tiny muted">
            {order?.pageCount ?? book.total} pages · {d.format === 'square' ? 'Square' : 'Portrait'}{' '}
            · {book.chosen.length} photos
          </div>
        </div>
      </div>
      <div className="divider" />
      <div className="row between" style={{ fontSize: 15 }}>
        <span>Digital PDF ({local.includedPages} pages included)</span>
        <span>{fmtEuro(local.baseCents)}</span>
      </div>
      <div className="row between muted" style={{ fontSize: 15 }}>
        <span>
          {local.extraPages} extra pages × {fmtEuro(local.extraPageCents)}
        </span>
        <span>{fmtEuro(subtotal - local.baseCents)}</span>
      </div>
      {discount > 0 && (
        <div className="row between" style={{ fontSize: 15, color: 'var(--primary-deep)' }}>
          <span>Discount ({order?.promoCode})</span>
          <span>−{fmtEuro(discount)}</span>
        </div>
      )}
      <div className="divider" />
      <div className="row between semibold" style={{ fontSize: 18 }}>
        <span>Total</span>
        <span>{fmtEuro(total)}</span>
      </div>
      {promo}
      <p className="tiny muted center pretty">
        You receive a downloadable, print‑ready PDF. Printed books ship later — we'll email you when
        they're ready.
      </p>
    </Card>
  );

  const accountForm = (
    <>
      <div className="tiny semibold muted" style={{ marginTop: 8 }}>
        Your Printagram account
      </div>
      {hasAccount ? (
        <Card bordered pad="tight" gap={4} style={{ padding: '14px 16px' }}>
          <div className="row between gap-12">
            <div>
              <div className="medium">{user?.email}</div>
              <div className="tiny muted">Your PDF and library will be saved to this account.</div>
            </div>
            <Pill>Signed in</Pill>
          </div>
        </Card>
      ) : (
        <Fieldset>
          <FieldInput
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={d.email}
            onChange={(e) => {
              d.setEmail(e.target.value);
              clearError();
            }}
            aria-label="Email"
          />
          <FieldInput
            placeholder="Create a password (8+ characters)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            aria-label="Password"
          />
        </Fieldset>
      )}
      <div className="tiny muted pretty">
        Keeps your photos and books for 3 months so you can order more without importing again.{' '}
        {!hasAccount && (
          <>
            Already have an account? <Link to="/signin?next=/checkout">Sign in</Link>
          </>
        )}
      </div>
      {pay === 'error' && (
        <Banner tone="error" tight>
          {payMsg}
        </Banner>
      )}
    </>
  );

  let payment: React.ReactNode = null;
  if (order && total === 0) {
    payment = (
      <div className="stack stack-10">
        <Banner tone="info" tight>
          Your discount covers the whole book — no payment needed.
        </Banner>
        {accountForm}
        <Button
          block
          size="xl"
          onClick={() => run(() => api.confirmFree(order.id))}
          disabled={pay === 'processing'}
        >
          {pay === 'processing' ? 'One moment…' : 'Get my PDF'}
        </Button>
      </div>
    );
  } else if (order && provider === 'fake') {
    payment = (
      <FakePayment
        cards={cfg.payment.testCards}
        amountCents={total}
        processing={pay === 'processing'}
        onPay={(card) => run(() => api.payTest(order.id, card))}
        accountForm={accountForm}
      />
    );
  } else if (order && provider === 'stripe' && clientSecret && cfg.payment.stripePublishableKey) {
    payment = (
      <Suspense fallback={<Spinner />}>
        <StripeBox
          publishableKey={cfg.payment.stripePublishableKey}
          clientSecret={clientSecret}
          amountCents={total}
          orderId={order.id}
          email={d.email}
          beforePay={ensureAccount}
          onPaid={async () => finishPaid(await api.syncOrder(order.id))}
          onError={(m) => {
            setPay('error');
            setPayMsg(m);
          }}
          processing={pay === 'processing'}
          setProcessing={(p) => setPay(p ? 'processing' : 'idle')}
          accountForm={accountForm}
        />
      </Suspense>
    );
  } else if (order && provider === 'stripe') {
    payment = (
      <Banner tone="error" tight>
        Payments are not configured correctly on this server.
      </Banner>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 40 }}>
      <header className="container row gap-12" style={{ padding: '14px var(--gutter)' }}>
        <button type="button" className="back" onClick={() => nav('/preview')} aria-label="Back">
          ←
        </button>
        <div className="h4">Checkout</div>
      </header>

      <div className="container grid-auto grid-auto--320" style={{ paddingTop: 8 }}>
        <div className="stack stack-22">
          <div className="stack stack-10">
            <Label>Choose a format</Label>
            <button type="button" className={`${s.option} ${s['option--on']}`}>
              <div>
                <div className="semibold">Digital PDF</div>
                <div className="tiny muted">Download instantly, print anywhere</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                {fmtEuro(total)}
              </div>
            </button>
            <div className={`${s.option} ${s['option--soon']}`}>
              <div>
                <div className="semibold" style={{ color: 'var(--text)' }}>
                  Softcover book <Pill tone="tag">Coming soon</Pill>
                </div>
                <div className="tiny">Printing & shipping</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                from {fmtEuro(cfg.pricing.printedFrom.softcoverCents)}
              </div>
            </div>
            <div className={`${s.option} ${s['option--soon']}`}>
              <div>
                <div className="semibold" style={{ color: 'var(--text)' }}>
                  Hardcover book <Pill tone="tag">Coming soon</Pill>
                </div>
                <div className="tiny">Linen cover, lay‑flat</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                from {fmtEuro(cfg.pricing.printedFrom.hardcoverCents)}
              </div>
            </div>
          </div>

          <div className="stack stack-10">
            <Label>Payment</Label>
            {!order && pay !== 'error' && (
              <div className="row gap-10 small muted">
                <Spinner variant="inline" /> Preparing checkout…
              </div>
            )}
            {payment}
            {!order && pay === 'error' && (
              <Banner tone="error" tight>
                {payMsg}
              </Banner>
            )}
          </div>
        </div>

        {summary}
      </div>
    </div>
  );
}
