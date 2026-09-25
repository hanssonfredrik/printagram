import { useState } from 'react';
import type { TestCard } from '@printagram/shared';
import { fmtEuro } from '@printagram/shared';
import { Banner, Button } from '@/components/ui';
import s from './checkout.module.css';

/**
 * Checkout for the "fake" payment provider. Deliberately has no editable card fields: nobody
 * should type a real card number into a page that takes no payment. The user picks one of the
 * published test cards and the server decides the outcome.
 */
export function FakePayment({
  cards,
  amountCents,
  processing,
  onPay,
  accountForm,
}: {
  cards: TestCard[];
  amountCents: number;
  processing: boolean;
  onPay: (card: string) => void;
  accountForm: React.ReactNode;
}) {
  const [card, setCard] = useState(cards[0]?.number ?? '');

  return (
    <div className="stack stack-10">
      <Banner tone="warn" title="Test payment — no money is taken">
        Printagram is in test mode. Choose a test card to see what happens; nothing is charged.
      </Banner>
      <div className="stack stack-8" role="radiogroup" aria-label="Test card">
        {cards.map((c) => (
          <label
            key={c.number}
            className={`${s.testCard} ${card === c.number ? s['testCard--on'] : ''}`}
          >
            <input
              type="radio"
              name="test-card"
              value={c.number}
              checked={card === c.number}
              onChange={() => setCard(c.number)}
            />
            <span className={s.cardChip} aria-hidden="true">
              TEST
            </span>
            <span className="stack" style={{ gap: 2 }}>
              <span className="mono small">{c.number}</span>
              <span className="tiny muted">{c.label}</span>
            </span>
          </label>
        ))}
      </div>
      {accountForm}
      <Button block size="xl" onClick={() => onPay(card)} disabled={processing || !card}>
        {processing ? 'Processing…' : 'Place test order'}
      </Button>
      <p className="tiny muted center pretty">
        In live mode this order would cost {fmtEuro(amountCents)}. Right now nothing is charged.
      </p>
    </div>
  );
}
