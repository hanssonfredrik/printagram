import { useNavigate } from 'react-router';
import { Button } from '@/components/ui';
import { Rich } from '@/components/Rich';
import { UpdatedDate } from '@/components/UpdatedDate';
import { useT } from '@/i18n';
import { fillPrice } from '@/seo/jsonld';
import { useMoney, usePriceList } from '@/state/price';

/** Static About page: what the name means, what the service does, privacy, who is behind it. */
export function About() {
  const nav = useNavigate();
  const t = useT();
  const ta = t.about;
  const money = useMoney();
  const price = money(usePriceList().baseCents);

  return (
    <div className="screen">
      <div
        className="container container--narrow stack stack-24"
        style={{ paddingTop: 24, paddingBottom: 48 }}
      >
        <div>
          <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>
            {ta.title}
          </h1>
          <p className="muted pretty">{fillPrice(ta.lead, price)}</p>
          <UpdatedDate page="about" label={ta.updated} style={{ marginTop: 6 }} />
        </div>

        <section className="stack stack-8">
          <h2 className="h3">{ta.factsTitle}</h2>
          <dl className="facts">
            {ta.facts.map((f) => (
              <div key={f.label} className="facts__row">
                <dt className="muted">{f.label}</dt>
                <dd>{fillPrice(f.value, price)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {ta.sections.map((sec) => (
          <section key={sec.title} className="stack stack-8">
            <h2 className="h3">{sec.title}</h2>
            {sec.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="pretty" style={{ lineHeight: 1.6 }}>
                <Rich text={p} />
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
