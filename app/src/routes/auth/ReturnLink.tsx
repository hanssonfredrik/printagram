import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Banner, Button, Card } from '@/components/ui';
import { api } from '@/services';
import { useSession } from '@/state/session';
import { useDraft } from '@/state/draft';
import { errorText, useT } from '@/i18n';

/**
 * Landing page for the emailed "return link". The token is only consumed after an explicit
 * click so that email scanners that prefetch links do not burn it.
 */
export function ReturnLink() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const t = useT();
  const tr = t.auth.returnLink;
  const setUser = useSession((x) => x.setUser);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const setSource = useDraft((d) => d.setSource);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { user, resumeTo } = await api.consumeMagicLink(token);
      setUser(user);
      await refreshLibraries();
      if (resumeTo.startsWith('/export')) setSource('export');
      nav(resumeTo || '/export/upload', { replace: true });
    } catch (e) {
      setErr(errorText(e, t, { NOT_FOUND: t.auth.linkInvalid }));
    } finally {
      setBusy(false);
    }
  };

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
        <h2 className="h2" style={{ fontSize: 26 }}>
          {tr.title}
        </h2>
        <p className="muted pretty">{tr.lead}</p>
        {err && (
          <Banner tone="error" tight>
            {err}
          </Banner>
        )}
        <Button block size="xl" onClick={go} disabled={busy}>
          {busy ? tr.busy : tr.submit}
        </Button>
      </Card>
    </div>
  );
}
