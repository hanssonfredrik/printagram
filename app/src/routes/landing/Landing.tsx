import { useNavigate } from 'react-router';
import { fmtEuro } from '@printagram/shared';
import { Button, Placeholder, Card } from '@/components/ui';
import { useConfig, useSession } from '@/state/session';
import { useDraft } from '@/state/draft';
import { artGradient } from '@/components/art';
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
    a: 'You choose the photos, cover, title, format and whether captions appear. The page layout is automatic so it always prints cleanly.',
  },
];

const PHONE_TILES = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];

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

  return (
    <div className="screen">
      <header className={s.header}>
        <span className="brand">Printagram</span>
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
          <Button size="md" onClick={start}>
            Start your book
          </Button>
        </div>
      </header>

      <section className={`${s.hero} grid-auto grid-auto--340`}>
        <div className="stack stack-20">
          <h1 className="h1">Your Instagram, as a real book.</h1>
          <p className={s.lead}>
            Pick the photos, we lay out the pages. A year, a trip, a first year — bound and printed,
            or a PDF you keep forever.
          </p>
          <div className="row row-wrap gap-12">
            <Button size="xl" onClick={start}>
              Start your book
            </Button>
            <span className="muted small">PDF from {fmtEuro(cfg.pricing.baseCents)}</span>
          </div>
          <div className="row gap-10 muted small">
            <span className="check check--big">✓</span>
            We never ask for your password. Connect through Instagram's own login, or upload your
            export.
          </div>
        </div>
        <div className={s.art} aria-hidden="true">
          <div className={s.book}>
            <Placeholder className={s.bookCover}>cover photo</Placeholder>
            <div className={s.bookTitle}>Our year · 2025</div>
          </div>
          <div className={s.phone}>
            <div className={s.phoneScreen}>
              {PHONE_TILES.map((h, i) => (
                <div key={i} style={{ background: artGradient(h) }} />
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
            ['Pick', 'Choose by month, year or most liked. Carousels included.'],
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
          Clean layouts, one or two photos per page, captions if you want them.
        </p>
        <div className="grid-auto grid-auto--300" style={{ gap: 20 }}>
          <div className="stack stack-10">
            <div className={s.spread}>
              <div className={`${s.page} ${s['page--left']}`}>
                <div className={s.fill} style={{ background: artGradient(0) }} />
              </div>
              <div className={`${s.page} ${s['page--right']}`}>
                <div className={s.fill} style={{ background: artGradient(1) }} />
                <div className={s.pageCaption}>Lisbon, March</div>
              </div>
            </div>
            <div className="small muted">A trip</div>
          </div>
          <div className="stack stack-10">
            <div className={s.spread}>
              <div className={`${s.page} ${s['page--left']} ${s['page--split']}`}>
                <div style={{ background: artGradient(3), borderRadius: 3 }} />
                <div style={{ background: artGradient(2), borderRadius: 3 }} />
              </div>
              <div className={`${s.page} ${s['page--right']}`}>
                <div className={s.fill} style={{ background: artGradient(0) }} />
              </div>
            </div>
            <div className="small muted">A first year</div>
          </div>
          <div className="stack stack-10">
            <div className={s.spread}>
              <div className={`${s.page} ${s['page--left']} ${s['page--text']}`}>
                2025
                <br />
                in 84 photos
              </div>
              <div className={`${s.page} ${s['page--right']}`}>
                <div className={s.fill} style={{ background: artGradient(1) }} />
              </div>
            </div>
            <div className="small muted">A year in review</div>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Pricing
        </h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          Every price includes {cfg.pricing.includedPages} pages. Extra pages are{' '}
          {fmtEuro(cfg.pricing.extraPageCents)} each.
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
            <div className={s.price}>from €29</div>
            <div className="muted">Printed and shipped to your door.</div>
            <div className={`${s.priceNote} muted`}>Coming soon</div>
          </Card>
          <Card bordered gap={6} className={s.priceCard}>
            <div className="semibold">Hardcover book</div>
            <div className={s.price}>from €49</div>
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
