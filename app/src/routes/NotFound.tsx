import { Button } from '@/components/ui';
import { useT } from '@/i18n';

export function NotFound() {
  const t = useT();
  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div className="stack stack-16 center" style={{ maxWidth: 400 }}>
        <h1 className="h2">{t.common.notFound.title}</h1>
        <p className="muted">{t.common.notFound.body}</p>
        <Button to="/">{t.common.notFound.home}</Button>
      </div>
    </div>
  );
}
