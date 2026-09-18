import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Banner, Button, Card, Spinner } from '@/components/ui';
import { api, type ShareInfo } from '@/services';

export function Share() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getShare(token)
      .then(setInfo)
      .catch((e) => setErr(e instanceof Error ? e.message : 'This link is not valid.'));
  }, [token]);

  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <Card
        bordered
        radius="2xl"
        pad="hero"
        center
        style={{ width: '100%', maxWidth: 440 }}
        gap={16}
      >
        <span className="brand">Printagram</span>
        {err && (
          <Banner tone="error" tight>
            {err}
          </Banner>
        )}
        {!info && !err && <Spinner />}
        {info && (
          <>
            <h2 className="h2" style={{ fontSize: 26 }}>
              {info.title}
            </h2>
            <p className="muted">
              {info.pages} pages ·{' '}
              {info.format === 'portrait' ? 'Portrait 21 × 28 cm' : 'Square 21 × 21 cm'}
              {info.bytes ? ` · ${(info.bytes / 1e6).toFixed(1)} MB` : ''}
            </p>
            {info.downloadUrl ? (
              <Button block size="xl" onClick={() => window.location.assign(info.downloadUrl)}>
                Download the PDF
              </Button>
            ) : (
              <Banner tone="soft" tight>
                The owner has not finished generating this PDF yet.
              </Banner>
            )}
            <p className="tiny muted">Made with Printagram — your Instagram, as a real book.</p>
            <Button variant="ghost" size="md" to="/">
              Make your own
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
