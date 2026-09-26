import { useState } from 'react';
import type { TestCard } from '@printagram/shared';
import { fmtEuro } from '@printagram/shared';
import { Banner, Button } from '@/components/ui';
import { useLang, useT } from '@/i18n';
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
  const t = useT();
  const lang = useLang((x) => x.lang);
  const [card, setCard] = useState(cards[0]?.number ?? '');

  return (
    <div className="stack stack-10">
      <Banner tone="warn" title={t.checkout.fake.bannerTitle}>
        {t.checkout.fake.bannerBody}
      </Banner>
      <div className="stack stack-8" role="radiogroup" aria-label={t.checkout.fake.cardGroup}>
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
              {t.checkout.fake.chip}
            </span>
            <span className="stack" style={{ gap: 2 }}>
              <span className="mono small">{c.number}</span>
              <span className="tiny muted">{t.checkout.fake.cards[c.outcome] ?? c.label}</span>
            </span>
          </label>
        ))}
      </div>
      {accountForm}
      <Button block size="xl" onClick={() => onPay(card)} disabled={processing || !card}>
        {processing ? t.checkout.processing : t.checkout.fake.place}
      </Button>
      <p className="tiny muted center pretty">
        {t.checkout.fake.liveCost(fmtEuro(amountCents, lang))}
      </p>
    </div>
  );
}
