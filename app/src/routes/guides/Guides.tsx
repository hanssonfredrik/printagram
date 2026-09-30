import { useNavigate } from 'react-router';
import type { Lang } from '@printagram/shared';
import { Button, Card } from '@/components/ui';
import { PageLink } from '@/components/PageLink';
import { useLang, useT } from '@/i18n';
import { useDraft } from '@/state/draft';
import type { GuideSection } from '@/i18n/en/guides';
import { GUIDE_KEYS, PAGES, type GuideKey } from '@/seo/routes';
import s from './guides.module.css';

function fmtDay(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** /guides: the list of guides. */
export function GuidesIndex() {
  const t = useT();
  const tg = t.guides;
  return (
    <div className="screen">
      <div className={`container container--narrow stack stack-28 ${s.page}`}>
        <div className="stack stack-10">
          <h1 className="h1" style={{ fontSize: 44 }}>
            {tg.index.title}
          </h1>
          <p className={`muted pretty ${s.lead}`}>{tg.index.lead}</p>
        </div>
        <div className="stack stack-16">
          {GUIDE_KEYS.map((key) => (
            <Card key={key} bordered gap={8}>
              <h2 className="h4">
                <PageLink page={key} className={s.cardLink}>
                  {tg.items[key].title}
                </PageLink>
              </h2>
              <p className="muted pretty">{tg.items[key].description}</p>
              <PageLink page={key} className={s.more}>
                {tg.index.read} →
              </PageLink>
            </Card>
          ))}
        </div>
        <StartCta />
      </div>
    </div>
  );
}

/** One guide: answer-first lead, sections, FAQ, related guides and a way into the app. */
export function GuidePage({ guide }: { guide: GuideKey }) {
  const t = useT();
  const lang = useLang((l) => l.lang);
  const g = t.guides.items[guide];
  const updated = PAGES[guide].updated;

  return (
    <div className="screen">
      <article className={`container container--narrow stack stack-28 ${s.page}`}>
        <nav aria-label={t.guides.breadcrumbLabel} className={`small muted ${s.crumbs}`}>
          <PageLink page="landing">{t.seo.breadcrumbHome}</PageLink>
          <span aria-hidden="true"> / </span>
          <PageLink page="guides">{t.guides.breadcrumb}</PageLink>
        </nav>

        <header className="stack stack-12">
          <h1 className="h1" style={{ fontSize: 'clamp(32px, 4.5vw, 44px)' }}>
            {g.title}
          </h1>
          {updated && (
            <p className="tiny muted">
              <time dateTime={updated}>{t.guides.updated(fmtDay(updated, lang))}</time>
            </p>
          )}
          <p className={`pretty ${s.lead}`}>{g.lead}</p>
        </header>

        {g.sections.map((sec) => (
          <Section key={sec.title} sec={sec} />
        ))}

        <section className="stack stack-8">
          <h2 className="h3">{t.guides.faqTitle}</h2>
          <div>
            {g.faq.map((f) => (
              <div key={f.q} className={s.faq}>
                <h3 className={s.faqQ}>{f.q}</h3>
                <p className="muted pretty">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <StartCta />

        <section className="stack stack-10">
          <h2 className="h4">{t.guides.related}</h2>
          <ul className={s.related}>
            {GUIDE_KEYS.filter((k) => k !== guide).map((k) => (
              <li key={k}>
                <PageLink page={k}>{t.guides.items[k].title}</PageLink>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}

function Section({ sec }: { sec: GuideSection }) {
  const t = useT();
  const steps =
    sec.steps ?? (sec.exportSteps ? t.exportFlow.guide.steps[sec.exportSteps] : undefined);
  return (
    <section className="stack stack-12">
      <h2 className="h3">{sec.title}</h2>
      {sec.paragraphs?.map((p) => (
        <p key={p.slice(0, 32)} className={`pretty ${s.body}`}>
          {p}
        </p>
      ))}
      {sec.bullets && (
        <ul className={s.bullets}>
          {sec.bullets.map((b) => (
            <li key={b.slice(0, 32)}>{b}</li>
          ))}
        </ul>
      )}
      {steps && (
        <ol className={s.steps}>
          {steps.map((st, i) => (
            <li key={st.title} className={s.step}>
              <span className="num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="stack stack-4">
                <div className="semibold">{st.title}</div>
                <p className={`muted pretty ${s.body}`}>{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function StartCta() {
  const t = useT();
  const nav = useNavigate();
  const setAdding = useDraft((d) => d.setAdding);
  return (
    <Card primary gap={10} className={s.cta}>
      <h2 className="h3">{t.guides.cta.title}</h2>
      <p className="pretty">{t.guides.cta.text}</p>
      <div>
        <Button
          size="lg"
          onClick={() => {
            setAdding(false);
            nav('/start');
          }}
        >
          {t.guides.cta.button}
        </Button>
      </div>
    </Card>
  );
}
