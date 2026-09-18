import { Button } from '@/components/ui';

export function NotFound() {
  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div className="stack stack-16 center" style={{ maxWidth: 400 }}>
        <h2 className="h2">Nothing here</h2>
        <p className="muted">The page you were looking for does not exist.</p>
        <Button to="/">Back to Printagram</Button>
      </div>
    </div>
  );
}
