import { useMemo, useState, type ReactNode } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { fmtEuro } from '@printagram/shared';
import { Button } from '@/components/ui';

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(key: string) {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key)!;
}

export interface StripeBoxProps {
  publishableKey: string;
  clientSecret: string;
  amountCents: number;
  orderId: string;
  email: string;
  beforePay: () => Promise<boolean>;
  onPaid: () => Promise<void>;
  onError: (message: string) => void;
  processing: boolean;
  setProcessing: (p: boolean) => void;
  accountForm: ReactNode;
}

/** Stripe Payment Element + Express Checkout (Apple Pay / Google Pay), styled to the design tokens. */
export default function StripeBox(props: StripeBoxProps) {
  const stripePromise = useMemo(() => getStripe(props.publishableKey), [props.publishableKey]);
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4A5FA8',
            colorBackground: '#ffffff',
            colorText: '#2A2622',
            colorTextSecondary: '#6F675E',
            colorDanger: '#8E3A2F',
            fontFamily: "'Albert Sans', Helvetica, sans-serif",
            borderRadius: '12px',
          },
          rules: {
            '.Input': { border: '1px solid #E6DFD3', boxShadow: 'none' },
            '.Input:focus': { border: '1px solid #4A5FA8', boxShadow: 'none' },
          },
        },
        fonts: [
          {
            cssSrc:
              'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600&display=swap',
          },
        ],
      }}
    >
      <Inner {...props} />
    </Elements>
  );
}

function Inner({
  amountCents,
  orderId,
  email,
  beforePay,
  onPaid,
  onError,
  processing,
  setProcessing,
  accountForm,
}: StripeBoxProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements || processing) return;
    if (!(await beforePay())) return;
    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/done/${orderId}`,
        receipt_email: email || undefined,
      },
      redirect: 'if_required',
    });
    if (error) {
      setProcessing(false);
      onError(error.message ?? 'Payment failed. Please try again.');
      return;
    }
    await onPaid();
  };

  return (
    <div className="stack stack-10">
      <ExpressCheckoutElement
        options={{ buttonHeight: 48, buttonTheme: { applePay: 'black', googlePay: 'white' } }}
        onConfirm={async (event) => {
          if (!stripe || !elements) {
            event.paymentFailed({ reason: 'fail' });
            return;
          }
          if (!(await beforePay())) {
            // Close the wallet sheet so the user can fix the account fields.
            event.paymentFailed({ reason: 'fail' });
            return;
          }
          setProcessing(true);
          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/done/${orderId}`,
              receipt_email: email || undefined,
            },
            redirect: 'if_required',
          });
          if (error) {
            setProcessing(false);
            onError(error.message ?? 'The wallet payment was cancelled. Please try again.');
            return;
          }
          await onPaid();
        }}
      />
      <div className="row gap-12 muted tiny">
        <div className="divider" style={{ flex: 1 }} />
        or pay by card
        <div className="divider" style={{ flex: 1 }} />
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 14,
        }}
      >
        <PaymentElement
          options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }}
          onReady={() => setReady(true)}
        />
      </div>
      {accountForm}
      <Button
        block
        size="xl"
        onClick={confirm}
        disabled={!ready || processing}
        style={{ opacity: processing ? 0.7 : 1 }}
      >
        {processing ? 'Processing…' : `Pay ${fmtEuro(amountCents)}`}
      </Button>
    </div>
  );
}
