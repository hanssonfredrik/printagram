import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Banner, Button, Card, Spinner } from '@/components/ui';
import { api, type ShareInfo } from '@/services';
import { errorText, useT } from '@/i18n';

export function Share() {
  const { token = '' } = useParams();
  const t = useT();
  const ts = t.share;
  const [info, setInfo] = useState<ShareInfo | null>(null);
  // The caught error itself, so its text follows the UI language.
  const [err, setErr] = useState<{ e: unknown } | null>(null);

  useEffect(() => {
    api
      .getShare(token)
      .then(setInfo)
      .catch((e: unknown) => setErr({ e }));
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
            {errorText(err.e, t, { NOT_FOUND: ts.invalid })}
          </Banner>
        )}
        {!info && !err && <Spinner />}
        {info && (
          <>
            <h2 className="h2" style={{ fontSize: 26 }}>
              {info.title}
            </h2>
            <p className="muted">
              {ts.pages(info.pages)} · {info.format === 'portrait' ? ts.portrait : ts.square}
              {info.bytes ? ` · ${ts.size(info.bytes / 1e6)}` : ''}
            </p>
            {info.downloadUrl ? (
              <Button block size="xl" onClick={() => window.location.assign(info.downloadUrl)}>
                {ts.download}
              </Button>
            ) : (
              <Banner tone="soft" tight>
                {ts.notReady}
              </Banner>
            )}
            <p className="tiny muted">{ts.madeWith}</p>
            <Button variant="ghost" size="md" to="/">
              {ts.makeOwn}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
