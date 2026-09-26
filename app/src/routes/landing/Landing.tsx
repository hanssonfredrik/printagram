import { useNavigate } from 'react-router';
import { fmtEuro } from '@printagram/shared';
import { Button, Card } from '@/components/ui';
import { PageRenderer } from '@/components/PageRenderer';
import { useConfig, useSession } from '@/state/session';
import { useDraft } from '@/state/draft';
import { SAMPLE_BY_ID, SAMPLE_PHOTOS, SAMPLE_SPREADS } from './samples';
import s from './landing.module.css';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is it safe?',
    a: "Yes. If you connect, you log in on Instagram's own site and Instagram lets us read your posts — nothing more. We can't post, message or see your password. If you upload, you download your own photos from Instagram and drop the file here. We never touch your account.",
  },
  {
    q: 'Connect or upload — which one?',
    a: 'Connect if you have a Creator or Business account: it takes seconds and brings your likes along. Upload the export if you have a personal account and want to keep it that way. It works for every account, but Instagram needs a few hours to a couple of days to prepare the file.',
  },
  {
    q: 'Do private accounts work?',
    a: 'Yes, with the export. Connecting needs a Professional account, and Instagram makes those public — so if you want to stay private, use the export.',
  },
  {
    q: 'How long does the Instagram export take?',
    a: "Usually a few hours, sometimes a day or two. Instagram emails you a download link when it's ready. We'll send you a return link so you can pick up where you left off.",
  },
  {
    q: 'What happens to my photos?',
    a: 'They stay in your Printagram library for 3 months so you can make more books without importing again. Every new book extends that by 3 months. Delete them yourself anytime, or we delete them when the 3 months are up — after a reminder email. Ordered PDFs stay downloadable either way.',
  },
  {
    q: 'What do I get right now?',
    a: 'A high‑resolution PDF you can print at any print shop. Printed books shipped to you are coming soon.',
  },
  {
    q: 'Can I edit the layout?',
    a: 'Yes. We lay the pages out for you, then you can pick a layout per page (one photo, two, three or four, or full‑bleed), drag photos between pages, add text pages and choose the cover, title, format and captions. The preview is exactly what prints.',
  },
];

const PHONE_TILES = [...SAMPLE_PHOTOS, ...SAMPLE_PHOTOS].slice(0, 12);

export function Landing() {
  const nav = useNavigate();
  const cfg = useConfig();
  const user = useSession((x) => x.user);
  const setAdding = useDraft((d) => d.setAdding);
  const start = () => {
    setAdding(false);
    nav('/start');
  };
  const signedIn = user?.authLevel === 'password' || user?.authLevel === 'email';
  const testMode = cfg.payment.provider === 'fake';
  const sampleProps = {
    format: 'square' as const,
    title: 'Our year · 2025',
    dateSpan: 'Jan – Nov 2025',
    photoCount: 84,
    cover: SAMPLE_BY_ID.get('sunset') ?? null,
    photosById: SAMPLE_BY_ID,
    showMeta: true,
    showLikes: false,
  };

  return (
    <div className="screen">
      <header className={s.header}>
        <div className="row gap-8">
          <span className="brand">Printagram</span>
          {testMode && (
            <span className={s.testPill} title="Payments are simulated. No money is taken.">
              Test mode
            </span>
          )}
        </div>
        <div className="row gap-8">
          {signedIn ? (
            <Button variant="ghost" size="md" onClick={() => nav('/books')}>
              My books
            </Button>
          ) : (
            <Button variant="ghost" size="md" onClick={() => nav('/signin')}>
              Sign in
            </Button>
          )}
          <Button size="md" onClick={start} className={s.headerCta}>
            Start your book
          </Button>
        </div>
      </header>

      <section className={`${s.hero} grid-auto grid-auto--340`}>
        <div className="stack stack-20">
          <h1 className="h1">Your Instagram, as a real book.</h1>
          <p className={s.lead}>
            Pick the photos, we lay out the pages. A year, a trip, a first year — as a print‑ready
            PDF you keep forever. Printed books are coming soon.
          </p>
          <div className="row row-wrap gap-12">
            <Button size="xl" onClick={start}>
              Start your book
            </Button>
            <span className="muted small">PDF {fmtEuro(cfg.pricing.baseCents)}</span>
          </div>
          <div className="row gap-10 muted small">
            <span className="check check--big">✓</span>
            We never ask for your password. Connect through Instagram's own login, or upload your
            export.
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
              {PHONE_TILES.map((p, i) => (
                <img key={i} src={p.thumbUrl} alt="" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s['section--first']}`}>
        <h2 className="h2" style={{ marginBottom: 28 }}>
          How it works
        </h2>
        <div className="grid-auto grid-auto--240">
          {[
            [
              'Bring in your photos',
              'Connect your Instagram in seconds, or upload the export Instagram sends you. Either way, we never see your password.',
            ],
            [
              'Pick',
              'Choose by month or year (or most liked, when you connect). Carousels included.',
            ],
            ['Print', 'Preview every page, then download your print‑ready PDF.'],
          ].map(([title, text], i) => (
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
          Sample spreads
        </h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          Real pages from the layout engine: one to four photos per page, full‑bleed or framed, text
          pages, captions if you want them.
        </p>
        <div className="grid-auto grid-auto--300" style={{ gap: 20 }}>
          {SAMPLE_SPREADS.map((sp) => (
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

      <section className={s.section}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Pricing
        </h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          One price for the PDF, however many photos and pages your book has.
        </p>
        <div className="grid-auto grid-auto--260">
          <Card primary gap={6} className={s.priceCard}>
            <div className="semibold">Digital PDF</div>
            <div className={s.price}>{fmtEuro(cfg.pricing.baseCents)}</div>
            <div className="muted">Print‑ready PDF, download instantly.</div>
            <div className={s.priceNote} style={{ color: 'var(--primary)', fontWeight: 500 }}>
              Available now
            </div>
          </Card>
          <Card bordered gap={6} className={s.priceCard}>
            <div className="semibold">Softcover book</div>
            <div className={s.price}>from {fmtEuro(cfg.pricing.printedFrom.softcoverCents)}</div>
            <div className="muted">Printed and shipped to your door.</div>
            <div className={`${s.priceNote} muted`}>Coming soon</div>
          </Card>
          <Card bordered gap={6} className={s.priceCard}>
            <div className="semibold">Hardcover book</div>
            <div className={s.price}>from {fmtEuro(cfg.pricing.printedFrom.hardcoverCents)}</div>
            <div className="muted">Linen‑wrapped, lay‑flat pages.</div>
            <div className={`${s.priceNote} muted`}>Coming soon</div>
          </Card>
        </div>
      </section>

      <section className={`${s.section} ${s['section--narrow']}`}>
        <h2 className="h2" style={{ marginBottom: 20 }}>
          Questions
        </h2>
        <div className="stack">
          {FAQ.map((f) => (
            <div key={f.q} className={s.faq}>
              <div className={s.faqQ}>{f.q}</div>
              <p className="muted">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="center" style={{ paddingTop: 48 }}>
          <Button size="xl" onClick={start}>
            Start your book
          </Button>
        </div>
      </section>
    </div>
  );
}
