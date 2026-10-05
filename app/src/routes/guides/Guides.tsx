import { useNavigate } from 'react-router';
import { Button, Card } from '@/components/ui';
import { PageLink } from '@/components/PageLink';
import { Rich } from '@/components/Rich';
import { UpdatedDate } from '@/components/UpdatedDate';
import { useT } from '@/i18n';
import { useDraft } from '@/state/draft';
import { useConfig } from '@/state/session';
import type { GuideSection } from '@/i18n/en/guides';
import { GUIDE_KEYS, type GuideKey } from '@/seo/routes';
import { featureOn, forFlags } from '@/seo/text';
import s from './guides.module.css';

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
          <UpdatedDate page="guides" label={tg.index.updated} />
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
  const cfg = useConfig();
  const g = t.guides.items[guide];

  return (
    <div className="screen">
      <article className={`container container--narrow stack stack-28 ${s.page}`}>
        <nav aria-label={t.guides.breadcrumbLabel} className={`small muted ${s.crumbs}`}>
          <PageLink page="landing">{t.seo.breadcrumbHome}</PageLink>
          <span aria-hidden="true"> / </span>
          <PageLink page="guides">{t.guides.breadcrumb}</PageLink>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{g.title}</span>
        </nav>

        <header className="stack stack-12">
          <h1 className="h1" style={{ fontSize: 'clamp(32px, 4.5vw, 44px)' }}>
            {g.title}
          </h1>
          <UpdatedDate page={guide} label={t.guides.updated} />
          <p className={`pretty ${s.lead}`}>
            <Rich text={g.lead} />
          </p>
        </header>

        {g.sections.map((sec) => (
          <Section key={sec.title} sec={sec} />
        ))}

        <section className="stack stack-8">
          <h2 className="h3">{t.guides.faqTitle}</h2>
          <div>
            {forFlags(g.faq, cfg).map((f) => (
              <div key={f.q} className={s.faq}>
                <h3 className={s.faqQ}>{f.q}</h3>
                <p className="muted pretty">
                  <Rich text={f.a} />
                </p>
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
  const cfg = useConfig();
  const bullets = sec.bullets
    ?.map((b) => (typeof b === 'string' ? { text: b, when: undefined } : b))
    .filter((b) => featureOn(b.when, cfg));
  const steps =
    sec.steps ?? (sec.exportSteps ? t.exportFlow.guide.steps[sec.exportSteps] : undefined);
  return (
    <section className="stack stack-12">
      <h2 className="h3">{sec.title}</h2>
      {sec.paragraphs?.map((p) => (
        <p key={p.slice(0, 32)} className={`pretty ${s.body}`}>
          <Rich text={p} />
        </p>
      ))}
      {bullets && (
        <ul className={s.bullets}>
          {bullets.map((b) => (
            <li key={b.text.slice(0, 32)}>
              <Rich text={b.text} />
            </li>
          ))}
        </ul>
      )}
      {sec.table && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption>{sec.table.caption}</caption>
            <thead>
              <tr>
                {sec.table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sec.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {sec.table.note && (
            <p className={`tiny muted pretty ${s.tableNote}`}>
              <Rich text={sec.table.note} />
            </p>
          )}
        </div>
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
                <p className={`muted pretty ${s.body}`}>
                  <Rich text={st.text} />
                </p>
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
