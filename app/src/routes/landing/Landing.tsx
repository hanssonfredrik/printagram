import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { photoSpan } from '@printagram/shared';
import { Button, Card } from '@/components/ui';
import { PageLink } from '@/components/PageLink';
import { PageRenderer } from '@/components/PageRenderer';
import { useMoney, usePriceList } from '@/state/price';
import { useDraft } from '@/state/draft';
import { useLang, useT } from '@/i18n';
import { fillPrice } from '@/seo/jsonld';
import { samplePhotos, sampleSpreads } from './samples';
import s from './landing.module.css';

export function Landing() {
  const nav = useNavigate();
  const t = useT();
  const tl = t.landing;
  const lang = useLang((x) => x.lang);
  const setAdding = useDraft((d) => d.setAdding);
  const start = () => {
    setAdding(false);
    nav('/start');
  };
  const money = useMoney();
  const prices = usePriceList();
  const price = money(prices.baseCents);
  const samples = useMemo(() => {
    const photos = samplePhotos(tl.samples);
    return {
      spreads: sampleSpreads(tl.samples),
      byId: new Map(photos.map((p) => [p.id, p])),
      span: photoSpan(photos, lang),
      phoneTiles: [...photos, ...photos].slice(0, 12),
    };
  }, [tl, lang]);
  const sampleProps = {
    format: 'square' as const,
    title: tl.samples.bookTitle,
    dateSpan: samples.span,
    photoCount: 84,
    cover: samples.byId.get('sunset') ?? null,
    photosById: samples.byId,
    showMeta: true,
    showLikes: false,
    lang,
  };

  return (
    <div className="screen">
      <section className={`${s.hero} grid-auto grid-auto--340`}>
        <div className="stack stack-20">
          <h1 className="h1">{tl.hero.title}</h1>
          <p className={s.lead}>{tl.hero.lead}</p>
          <div className="row row-wrap gap-12">
            <Button size="xl" onClick={start}>
              {tl.start}
            </Button>
            <span className="muted small">{tl.hero.price(price)}</span>
          </div>
          <div className="row gap-10 muted small">
            <span className="check check--big">✓</span>
            {tl.hero.noPassword}
          </div>
        </div>
        <div className={s.art} aria-hidden="true">
          <div className={s.book}>
            <PageRenderer
              page={{ type: 'cover', index: 0 }}
              {...sampleProps}
              className={s.bookPage}
            />
          </div>
          <div className={s.phone}>
            <div className={s.phoneScreen}>
              {samples.phoneTiles.map((p, i) => (
                <img key={i} src={p.thumbUrl} alt="" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={`${s.section} ${s['section--first']}`}>
        <h2 className="h2" style={{ marginBottom: 28 }}>
          {tl.how.title}
        </h2>
        <div className="grid-auto grid-auto--240">
          {tl.how.steps.map(({ title, text }, i) => (
            <Card key={title} gap={8}>
              <div className="num">{i + 1}</div>
              <div className="semibold" style={{ fontSize: 18 }}>
                {title}
              </div>
              <p className="muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          {tl.samples.title}
        </h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          {tl.samples.intro}
        </p>
        <div className="grid-auto grid-auto--300" style={{ gap: 20 }}>
          {samples.spreads.map((sp) => (
            <div key={sp.label} className="stack stack-10">
              <div className={s.spread} aria-hidden="true">
                {sp.pages.map((pg, k) => (
                  <PageRenderer
                    key={k}
                    page={pg}
                    {...sampleProps}
                    className={`${s.spreadPage} ${k === 0 ? s['page--left'] : s['page--right']}`}
                  />
                ))}
              </div>
              <div className="small muted">{sp.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className={s.section}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          {tl.pricing.title}
        </h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          {tl.pricing.intro}
        </p>
        <div className="grid-auto grid-auto--260">
          <Card primary gap={6} className={s.priceCard}>
            <div className="semibold">{tl.pricing.pdf.title}</div>
            <div className={s.price}>{price}</div>
            <div className="muted">{tl.pricing.pdf.text}</div>
            <div className={s.priceNote} style={{ color: 'var(--primary)', fontWeight: 500 }}>
              {tl.pricing.pdf.note}
            </div>
          </Card>
          <Card bordered gap={6} className={s.priceCard}>
            <div className="semibold">{tl.pricing.softcover.title}</div>
            <div className={s.price}>
              {tl.pricing.from(money(prices.printedFrom.softcoverCents))}
            </div>
            <div className="muted">{tl.pricing.softcover.text}</div>
            <div className={`${s.priceNote} muted`}>{tl.pricing.comingSoon}</div>
          </Card>
          <Card bordered gap={6} className={s.priceCard}>
            <div className="semibold">{tl.pricing.hardcover.title}</div>
            <div className={s.price}>
              {tl.pricing.from(money(prices.printedFrom.hardcoverCents))}
            </div>
            <div className="muted">{tl.pricing.hardcover.text}</div>
            <div className={`${s.priceNote} muted`}>{tl.pricing.comingSoon}</div>
          </Card>
        </div>
      </section>

      <section className={`${s.section} ${s['section--narrow']}`}>
        <h2 className="h2" style={{ marginBottom: 20 }}>
          {tl.faqTitle}
        </h2>
        <div className="stack">
          {tl.faq.map((f) => (
            <div key={f.q} className={s.faq}>
              <div className={s.faqQ}>{f.q}</div>
              <p className="muted">{fillPrice(f.a, price)}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ paddingTop: 20 }}>
          {tl.guidesTeaser} <PageLink page="guides">{tl.guidesLink}</PageLink>
        </p>
        <div className="center" style={{ paddingTop: 48 }}>
          <Button size="xl" onClick={start}>
            {tl.start}
          </Button>
        </div>
      </section>
    </div>
  );
}
