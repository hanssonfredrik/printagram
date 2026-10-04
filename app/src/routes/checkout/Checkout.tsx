import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Order, PaymentProviderName, PromoRejection } from '@printagram/shared';
import { currencyForLang, fmtMoney, priceList, promoMessage } from '@printagram/shared';
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
  WizardBar,
} from '@/components/ui';
import { CoverThumb } from '@/components/PageRenderer';
import { errorText, useLang, useT } from '@/i18n';
import { ApiClientError, api } from '@/services';
import { useDraft } from '@/state/draft';
import { saveCurrentDraft, useBook } from '@/state/useBook';
import { useConfig, useSession } from '@/state/session';
import { FakePayment } from './FakePayment';
import s from './checkout.module.css';

const StripeBox = lazy(() => import('./StripeBox'));

type PayState = 'idle' | 'processing' | 'error';

export function Checkout() {
  const t = useT();
  const lang = useLang((x) => x.lang);
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
  // The language picks the currency; an open order keeps the one it was created in.
  const currency = order?.currency ?? currencyForLang(lang);
  const prices = priceList(cfg.pricing, currency);
  const money = (cents: number) => fmtMoney(cents, currency, lang);
  const local = prices.baseCents;
  const subtotal = order?.subtotalCents ?? local;
  const discount = order?.discountCents ?? 0;
  const total = order?.amountCents ?? local;

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
        setPayMsg(errorText(e, t));
      } finally {
        creating.current = false;
      }
    })();
    // A language switch changes the currency, so it asks again (the API opens an order in it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.ready, book.libraryId, lang]);

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
      setPayMsg(t.checkout.needEmail);
      return false;
    }
    if (password.length < 8) {
      setPay('error');
      setPayMsg(t.checkout.needPassword);
      return false;
    }
    try {
      const u = await api.register(d.email, password);
      setUser(u);
      return true;
    } catch (e) {
      setPay('error');
      if (e instanceof ApiClientError && e.code === 'EMAIL_TAKEN') {
        setPayMsg(t.checkout.emailTaken);
      } else {
        setPayMsg(errorText(e, t));
      }
      return false;
    }
  }, [d.email, hasAccount, password, setUser, t]);

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
      setPayMsg(errorText(e, t));
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
      if (res.rejected)
        setPromoMsg(promoMessage(res.rejected.code as PromoRejection, lang) ?? res.rejected.reason);
      else setPromoInput('');
    } catch (e) {
      setPromoMsg(errorText(e, t));
    } finally {
      setPromoBusy(false);
    }
  };

  const promo = (
    <div className="stack stack-8">
      {order?.promoCode ? (
        <div className={s.promoApplied}>
          <span>
            {t.checkout.promoAppliedBefore}
            <strong>{order.promoCode}</strong>
            {t.checkout.promoAppliedAfter(money(discount))}
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => applyPromo('')}
            disabled={promoBusy}
          >
            {t.checkout.promoRemove}
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
            placeholder={t.checkout.promoPlaceholder}
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoMsg(null);
            }}
            aria-label={t.checkout.promoPlaceholder}
            autoCapitalize="characters"
            style={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={promoBusy || !order || !promoInput.trim()}
          >
            {promoBusy ? t.checkout.promoChecking : t.checkout.promoApply}
          </Button>
        </form>
      ) : (
        <button
          type="button"
          className="link-button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setPromoOpen(true)}
        >
          {t.checkout.promoOpen}
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
            {t.checkout.bookLine(
              order?.pageCount ?? book.total,
              d.format === 'square' ? t.checkout.square : t.checkout.portrait,
              book.chosen.length,
            )}
          </div>
        </div>
      </div>
      <div className="divider" />
      <div className="row between" style={{ fontSize: 15 }}>
        <span>{t.checkout.digitalPdf}</span>
        <span>{money(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="row between" style={{ fontSize: 15, color: 'var(--primary-deep)' }}>
          <span>{t.checkout.discount(order?.promoCode ?? '')}</span>
          <span>−{money(discount)}</span>
        </div>
      )}
      <div className="divider" />
      <div className="row between semibold" style={{ fontSize: 18 }}>
        <span>{t.checkout.total}</span>
        <span>{money(total)}</span>
      </div>
      {promo}
      <p className="tiny muted center pretty">{t.checkout.summaryNote}</p>
    </Card>
  );

  const accountForm = (
    <>
      <div className="tiny semibold muted" style={{ marginTop: 8 }}>
        {t.checkout.accountTitle}
      </div>
      {hasAccount ? (
        <Card bordered pad="tight" gap={4} style={{ padding: '14px 16px' }}>
          <div className="row between gap-12">
            <div>
              <div className="medium">{user?.email}</div>
              <div className="tiny muted">{t.checkout.accountSaved}</div>
            </div>
            <Pill>{t.checkout.signedIn}</Pill>
          </div>
        </Card>
      ) : (
        <Fieldset>
          <FieldInput
            placeholder={t.checkout.email}
            type="email"
            autoComplete="email"
            value={d.email}
            onChange={(e) => {
              d.setEmail(e.target.value);
              clearError();
            }}
            aria-label={t.checkout.email}
          />
          <FieldInput
            placeholder={t.checkout.passwordPlaceholder}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            aria-label={t.checkout.password}
          />
        </Fieldset>
      )}
      <div className="tiny muted pretty">
        {t.checkout.accountKeeps}{' '}
        {!hasAccount && (
          <>
            {t.checkout.haveAccount}
            <Link to="/signin?next=/checkout">{t.checkout.signIn}</Link>
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
          {t.checkout.freeBanner}
        </Banner>
        {accountForm}
        <Button
          block
          size="xl"
          onClick={() => run(() => api.confirmFree(order.id))}
          disabled={pay === 'processing'}
        >
          {pay === 'processing' ? t.checkout.oneMoment : t.checkout.getPdf}
        </Button>
      </div>
    );
  } else if (order && provider === 'fake') {
    payment = (
      <FakePayment
        cards={cfg.payment.testCards}
        amountCents={total}
        currency={currency}
        processing={pay === 'processing'}
        onPay={(card) => run(() => api.payTest(order.id, card))}
        accountForm={accountForm}
      />
    );
  } else if (order && provider === 'stripe' && clientSecret && cfg.payment.stripePublishableKey) {
    payment = (
      <Suspense fallback={<Spinner />}>
        <StripeBox
          // A new PaymentIntent (another currency) needs a fresh Elements instance.
          key={clientSecret}
          publishableKey={cfg.payment.stripePublishableKey}
          clientSecret={clientSecret}
          amountCents={total}
          currency={currency}
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
        {t.checkout.notConfigured}
      </Banner>
    );
  }

  return (
    <div className="screen screen--bar">
      <header className="container row gap-12" style={{ padding: '14px var(--gutter)' }}>
        <div className="h4">{t.checkout.title}</div>
      </header>

      <div className="container grid-auto grid-auto--320" style={{ paddingTop: 8 }}>
        <div className="stack stack-22">
          <div className="stack stack-10">
            <Label>{t.checkout.chooseFormat}</Label>
            <button type="button" className={`${s.option} ${s['option--on']}`}>
              <div>
                <div className="semibold">{t.checkout.digitalPdf}</div>
                <div className="tiny muted">{t.checkout.pdfHint}</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                {money(total)}
              </div>
            </button>
            <div className={`${s.option} ${s['option--soon']}`}>
              <div>
                <div className="semibold" style={{ color: 'var(--text)' }}>
                  {t.checkout.softcover} <Pill tone="tag">{t.checkout.comingSoon}</Pill>
                </div>
                <div className="tiny">{t.checkout.softcoverHint}</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                {t.checkout.from(money(prices.printedFrom.softcoverCents))}
              </div>
            </div>
            <div className={`${s.option} ${s['option--soon']}`}>
              <div>
                <div className="semibold" style={{ color: 'var(--text)' }}>
                  {t.checkout.hardcover} <Pill tone="tag">{t.checkout.comingSoon}</Pill>
                </div>
                <div className="tiny">{t.checkout.hardcoverHint}</div>
              </div>
              <div className="serif" style={{ fontSize: 20 }}>
                {t.checkout.from(money(prices.printedFrom.hardcoverCents))}
              </div>
            </div>
          </div>

          <div className="stack stack-10">
            <Label>{t.checkout.payment}</Label>
            {!order && pay !== 'error' && (
              <div className="row gap-10 small muted">
                <Spinner variant="inline" /> {t.checkout.preparing}
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

      <WizardBar onBack={() => nav('/preview')}>
        <div className="semibold">{t.checkout.totalAmount(money(total))}</div>
        <div className="tiny muted">{t.checkout.digitalPdf}</div>
      </WizardBar>
    </div>
  );
}
