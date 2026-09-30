import { useT } from '@/i18n';

/** Privacy policy (`/privacy`) and terms of use (`/terms`), rendered from the `legal` dictionary. */
export function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const t = useT();
  const d = t.legal[doc];

  return (
    <div className="screen">
      <div
        className="container container--narrow stack stack-24"
        style={{ paddingTop: 24, paddingBottom: 48 }}
      >
        <div>
          <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>
            {d.title}
          </h1>
          <p className="muted pretty">{d.lead}</p>
          <p className="tiny muted" style={{ marginTop: 6 }}>
            {t.legal.updated}
          </p>
        </div>

        {d.sections.map((sec) => (
          <section key={sec.title} className="stack stack-8">
            <h2 className="h3">{sec.title}</h2>
            {sec.paragraphs.map((p) => (
              <p key={p.slice(0, 32)} className="pretty" style={{ lineHeight: 1.6 }}>
                {p}
              </p>
            ))}
          </section>
        ))}

        <p className="small muted">
          <a href={`mailto:${t.legal.contact}`}>{t.legal.contact}</a>
        </p>
      </div>
    </div>
  );
}
