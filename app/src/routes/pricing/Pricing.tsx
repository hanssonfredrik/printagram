import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { currencyForLang } from '@printagram/shared';
import { Button, Card } from '@/components/ui';
import { Rich } from '@/components/Rich';
import { UpdatedDate } from '@/components/UpdatedDate';
import { useLang, useT } from '@/i18n';
import { fillPrice } from '@/seo/jsonld';
import { trackEvent } from '@/services/analytics';
import { useMoney, usePriceList } from '@/state/price';
import s from './pricing.module.css';

/**
 * Pricing page: the three price cards from the landing page, what the PDF includes, worked
 * examples, what printing adds, the comparison with other services, payment facts and a FAQ.
 */
export function Pricing() {
  const nav = useNavigate();
  const t = useT();
  const tp = t.pricing;
  const cards = t.landing.pricing;
  const lang = useLang((x) => x.lang);
  const money = useMoney();
  const prices = usePriceList();
  const price = money(prices.baseCents);
  const fill = (text: string) => fillPrice(text, price);

  useEffect(() => {
    trackEvent('view_item', {
      currency: currencyForLang(lang).toUpperCase(),
      value: prices.baseCents / 100,
      items: [{ item_id: 'pdf-book', item_name: 'Photo book PDF', price: prices.baseCents / 100 }],
    });
  }, [lang, prices.baseCents]);

  return (
    <div className="screen">
      <div
        className="container container--narrow stack stack-32"
        style={{ paddingTop: 24, paddingBottom: 48 }}
      >
        <div>
          <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>
            {tp.title}
          </h1>
          <p className="muted pretty">{fill(tp.lead)}</p>
          <UpdatedDate page="pricing" label={tp.updated} style={{ marginTop: 6 }} />
        </div>

        <section className="stack stack-16">
          <h2 className="h3">{tp.cardsTitle}</h2>
          <div className="grid-auto grid-auto--240">
            <Card primary gap={6} className={s.priceCard}>
              <h3 className={s.cardTitle}>{cards.pdf.title}</h3>
              <div className={s.price}>{price}</div>
              <div className="muted">{cards.pdf.text}</div>
              <div className={s.priceNote} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                {cards.pdf.note}
              </div>
            </Card>
            <Card bordered gap={6} className={s.priceCard}>
              <h3 className={s.cardTitle}>{cards.softcover.title}</h3>
              <div className={s.price}>{cards.from(money(prices.printedFrom.softcoverCents))}</div>
              <div className="muted">{cards.softcover.text}</div>
              <div className={`${s.priceNote} muted`}>{cards.comingSoon}</div>
            </Card>
            <Card bordered gap={6} className={s.priceCard}>
              <h3 className={s.cardTitle}>{cards.hardcover.title}</h3>
              <div className={s.price}>{cards.from(money(prices.printedFrom.hardcoverCents))}</div>
              <div className="muted">{cards.hardcover.text}</div>
              <div className={`${s.priceNote} muted`}>{cards.comingSoon}</div>
            </Card>
          </div>
        </section>

        <section className="stack stack-8">
          <h2 className="h3">{tp.included.title}</h2>
          <ul className={s.list}>
            {tp.included.items.map((item) => (
              <li key={item.slice(0, 24)} className="pretty">
                {fill(item)}
              </li>
            ))}
          </ul>
        </section>

        <section className="stack stack-8">
          <h2 className="h3">{tp.examples.title}</h2>
          <p className="pretty" style={{ lineHeight: 1.6 }}>
            {tp.examples.intro}
          </p>
          <dl className="facts">
            {tp.examples.rows.map((r) => (
              <div key={r.label} className="facts__row">
                <dt className="muted">{r.label}</dt>
                <dd className="semibold">{fill(r.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="muted small pretty">{tp.examples.note}</p>
        </section>

        {[tp.printing, tp.compare].map((sec) => (
          <section key={sec.title} className="stack stack-8">
            <h2 className="h3">{sec.title}</h2>
            {sec.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="pretty" style={{ lineHeight: 1.6 }}>
                <Rich text={fill(p)} />
              </p>
            ))}
          </section>
        ))}

        <section className="stack stack-8">
          <h2 className="h3">{tp.payment.title}</h2>
          <ul className={s.list}>
            {tp.payment.items.map((item) => (
              <li key={item.slice(0, 24)} className="pretty">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="stack stack-8">
          <h2 className="h3">{tp.faqTitle}</h2>
          <div className="stack">
            {tp.faq.map((f) => (
              <div key={f.q} className={s.faq}>
                <h3 className={s.faqQ}>{f.q}</h3>
                <p className="muted">
                  <Rich text={fill(f.a)} />
                </p>
              </div>
            ))}
          </div>
        </section>

        <div>
          <Button size="lg" onClick={() => nav('/start')}>
            {tp.start}
          </Button>
        </div>
      </div>
    </div>
  );
}
