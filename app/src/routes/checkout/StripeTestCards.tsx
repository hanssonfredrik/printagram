import { useState } from 'react';
import { STRIPE_TEST_CARDS } from '@printagram/shared';
import { Banner } from '@/components/ui';
import { useT } from '@/i18n';
import s from './checkout.module.css';

/**
 * Shown above Stripe's card form while Stripe runs with test keys: which card numbers to type
 * and what each one does. Copying puts the digits on the clipboard for pasting into the form.
 */
export function StripeTestCards() {
  const t = useT();
  const ts = t.checkout.stripeTest;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ''));
      setCopied(number);
    } catch {
      setCopied(null);
    }
  };

  return (
    <Banner tone="warn" title={ts.title}>
      <div className="stack stack-8">
        <p className="pretty">{ts.body}</p>
        <ul className={s.stripeTestList} aria-label={ts.listLabel}>
          {STRIPE_TEST_CARDS.map((c) => (
            <li key={c.number} className={s.stripeTestCard}>
              <span className="stack" style={{ gap: 2 }}>
                <span className="mono small">{c.number}</span>
                <span className="tiny muted">{ts.cards[c.outcome]}</span>
              </span>
              <button
                type="button"
                className="link-button"
                onClick={() => void copy(c.number)}
                aria-label={ts.copyLabel(c.number)}
              >
                {copied === c.number ? ts.copied : ts.copy}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Banner>
  );
}
