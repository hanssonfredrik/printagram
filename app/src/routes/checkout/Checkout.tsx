import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Order } from '@printagram/shared';
import { fmtEuro, price } from '@printagram/shared';
import {
  Banner,
  Button,
  Card,
  FieldInput,
  FieldRow,
  Fieldset,
  Label,
  Pill,
  Spinner,
} from '@/components/ui';
import { CoverThumb } from '@/components/PageRenderer';
import { ApiClientError, api } from '@/services';
import { useDraft } from '@/state/draft';
import { useBook } from '@/state/useBook';
import { useConfig, useSession } from '@/state/session';
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
  const [mock, setMock] = useState(true);
  const [pay, setPay] = useState<PayState>('idle');
  const [payMsg, setPayMsg] = useState('');
  const [password, setPassword] = useState('');
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const creating = useRef(false);

  const hasAccount = user?.authLevel === 'password';
  const pr = price(book.total, cfg.pricing);

  // Make sure a draft exists and an order is open for it.
  useEffect(() => {
    if (!book.ready || book.chosen.length === 0 || !book.libraryId || creating.current) return;
    creating.current = true;
    (async () => {
      try {
        await ensureSession();
        let bookId = d.draftBookId;
        const saved = await api.saveDraft({
          id: bookId,
          libraryId: book.libraryId!,
          settings: {
            title: d.title,
            format: d.format,
            showMeta: d.showMeta,
            coverPhotoId: book.cover?.id ?? null,
          },
          photoIds: book.chosen.map((p) => p.id),
        });
        bookId = saved.id;
        d.setBook({ draftBookId: bookId });
        const res = await api.createOrder(bookId);
        setOrder(res.order);
        setClientSecret(res.clientSecret);
        setMock(res.mock);
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
          'That email already has a Printagram account. Sign in below to continue with this book.',
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

  const mockPayCard = async () => {
    if (!order || pay === 'processing') return;
    if (
      card.number.replace(/\s/g, '').length < 12 ||
      !card.exp ||
      card.cvc.length < 3 ||
      !card.name
    ) {
      setPay('error');
      setPayMsg('Please complete all card details.');
      return;
    }
    if (!(await ensureAccount())) return;
    setPay('processing');
    try {
      finishPaid(await api.mockPay(order.id, 'ok'));
    } catch (e) {
      setPay('error');
      setPayMsg(e instanceof Error ? e.message : 'Payment failed.');
    }
  };

  const mockPayWallet = async () => {
    if (!order || pay === 'processing') return;
    if (!d.email) d.setEmail('you@example.com');
    if (!hasAccount && password.length < 8) setPassword('demo-password');
    setPay('processing');
    try {
      // Wallets carry the email; the account gets a generated password the user can reset later.
      if (!hasAccount)
        setUser(
          await api.register(
            d.email || 'you@example.com',
            password.length >= 8 ? password : 'demo-password',
          ),
        );
      finishPaid(await api.mockPay(order.id, 'ok'));
    } catch (e) {
      setPay('error');
      setPayMsg(
        e instanceof Error && e.message.includes('declined')
          ? 'The wallet payment was cancelled. Please try again.'
          : e instanceof Error
            ? e.message
            : 'Payment failed.',
      );
    }
  };

  const summary = (
    <Card bordered pad="wide" gap={14} style={{ padding: 20 }}>
      <div className="row gap-14">
        <CoverThumb src={book.cover?.thumbUrl} format={d.format} width={64} />
        <div>
          <div className="serif" style={{ fontSize: 18 }}>
            {d.title}
          </div>
          <div className="tiny muted">
            {book.total} pages · {d.format === 'square' ? 'Square' : 'Portrait'} ·{' '}
            {book.chosen.length} photos
          </div>
        </div>
      </div>
      <div className="divider" />
      <div className="row between" style={{ fontSize: 15 }}>
        <span>Digital PDF ({pr.includedPages} pages included)</span>
        <span>{fmtEuro(pr.baseCents)}</span>
      </div>
      <div className="row between muted" style={{ fontSize: 15 }}>
        <span>
          {pr.extraPages} extra pages × {fmtEuro(pr.extraPageCents)}
        </span>
        <span>{fmtEuro(pr.extraCents)}</span>
      </div>
      <div className="divider" />
      <div className="row between semibold" style={{ fontSize: 18 }}>
        <span>Total</span>
        <span>{fmtEuro(pr.totalCents)}</span>
      </div>
      {mock && (
        <Button
          block
          size="xl"
          onClick={mockPayCard}
          disabled={pay === 'processing' || !order}
          style={{ opacity: pay === 'processing' ? 0.7 : 1 }}
        >
          {pay === 'processing' ? 'Processing…' : `Pay ${fmtEuro(pr.totalCents)}`}
        </Button>
      )}
      <p className="tiny muted center pretty">
        In this version you receive a downloadable, print‑ready PDF. Printed books ship later —
        we'll email you when they're ready.
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
                {fmtEuro(pr.totalCents)}
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
                from €29
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
                from €49
              </div>
            </div>
          </div>

          <div className="stack stack-10">
            <Label>Payment</Label>
            {!order && pay !== 'error' && (
              <div className="row gap-10 small muted">
                <Spinner variant="inline" /> Preparing secure checkout…
              </div>
            )}
            {order && mock && (
              <>
                <div className="grid-2">
                  <Button
                    variant="dark"
                    size="lg"
                    onClick={mockPayWallet}
                    disabled={pay === 'processing'}
                  >
                    Pay
                  </Button>
                  <Button
                    variant="dark-outline"
                    size="lg"
                    onClick={mockPayWallet}
                    disabled={pay === 'processing'}
                  >
                    G Pay
                  </Button>
                </div>
                <div className="row gap-12 muted tiny">
                  <div className="divider" style={{ flex: 1 }} />
                  or pay by card
                  <div className="divider" style={{ flex: 1 }} />
                </div>
                <Fieldset>
                  <FieldInput
                    placeholder="Card number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={card.number}
                    onChange={(e) => {
                      setCard({ ...card, number: e.target.value });
                      clearError();
                    }}
                    aria-label="Card number"
                  />
                  <FieldRow>
                    <FieldInput
                      placeholder="MM / YY"
                      autoComplete="cc-exp"
                      value={card.exp}
                      onChange={(e) => {
                        setCard({ ...card, exp: e.target.value });
                        clearError();
                      }}
                      aria-label="Expiry"
                    />
                    <FieldInput
                      placeholder="CVC"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={card.cvc}
                      onChange={(e) => {
                        setCard({ ...card, cvc: e.target.value });
                        clearError();
                      }}
                      aria-label="CVC"
                    />
                  </FieldRow>
                  <FieldInput
                    placeholder="Name on card"
                    autoComplete="cc-name"
                    value={card.name}
                    onChange={(e) => {
                      setCard({ ...card, name: e.target.value });
                      clearError();
                    }}
                    aria-label="Name on card"
                  />
                </Fieldset>
                {accountForm}
              </>
            )}
            {order && !mock && clientSecret && cfg.stripePublishableKey && (
              <Suspense fallback={<Spinner />}>
                <StripeBox
                  publishableKey={cfg.stripePublishableKey}
                  clientSecret={clientSecret}
                  amountCents={pr.totalCents}
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
            )}
            {order && !mock && !cfg.stripePublishableKey && (
              <Banner tone="error" tight>
                Payments are not configured on this server (missing Stripe publishable key).
              </Banner>
            )}
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
