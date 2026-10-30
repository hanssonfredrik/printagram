import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';

/**
 * Where Meta's data-deletion status link lands. The API answers Instagram's callback with
 * `${appBaseUrl}/privacy/deletion?code=…` (api/src/functions/instagram.ts, instagramDataDeletion);
 * App Review opens that link. Not indexed: the route is in APP_ROUTES and PublicLayout sets noindex.
 */
export function DeletionStatus() {
  const t = useT();
  const td = t.legal.deletion;
  const [params] = useSearchParams();
  const code = params.get('code');
  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div className="stack stack-16 center" style={{ maxWidth: 480 }}>
        <h1 className="h2">{td.title}</h1>
        <p className="muted pretty">{td.lead}</p>
        <p className="semibold">{code ? td.code(code) : td.noCode}</p>
        <p className="muted small pretty">{td.note}</p>
        <Button to="/">{td.home}</Button>
      </div>
    </div>
  );
}
