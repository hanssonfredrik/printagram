import { useNavigate } from 'react-router';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';

/** Static About page: what the name means, what the service does, privacy, who is behind it. */
export function About() {
  const nav = useNavigate();
  const t = useT();
  const ta = t.about;

  return (
    <div className="screen">
      <div
        className="container container--narrow stack stack-24"
        style={{ paddingTop: 24, paddingBottom: 48 }}
      >
        <div className="row gap-12">
          <button
            type="button"
            className="back"
            onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}
            aria-label={t.common.back}
          >
            ←
          </button>
          <button
            type="button"
            className="brand"
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            onClick={() => nav('/')}
          >
            {t.common.brand}
          </button>
        </div>

        <div>
          <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>
            {ta.title}
          </h1>
          <p className="muted pretty">{ta.lead}</p>
        </div>

        {ta.sections.map((sec) => (
          <section key={sec.title} className="stack stack-8">
            <h2 className="h3">{sec.title}</h2>
            {sec.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="pretty" style={{ lineHeight: 1.6 }}>
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="stack stack-8">
          <h2 className="h3">{ta.contactTitle}</h2>
          <p className="pretty" style={{ lineHeight: 1.6 }}>
            {ta.contactText} <a href={`mailto:${ta.contactEmail}`}>{ta.contactEmail}</a>.
          </p>
        </section>

        <div>
          <Button size="lg" onClick={() => nav('/start')}>
            {ta.start}
          </Button>
        </div>
      </div>
    </div>
  );
}
