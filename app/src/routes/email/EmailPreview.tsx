import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Photo } from '@printagram/shared';
import { fmtDate } from '@printagram/shared';
import { Button } from '@/components/ui';
import { api } from '@/services';
import { useSession } from '@/state/session';
import { useDraft } from '@/state/draft';

/** Dev-only preview of the reminder email (sent 7 days before a library is deleted). */
export function EmailPreview() {
  const nav = useNavigate();
  const user = useSession((x) => x.user);
  const libraries = useSession((x) => x.libraries);
  const email = useDraft((d) => d.email);
  const [sample, setSample] = useState<Photo[]>([]);
  const lib = libraries[0];

  useEffect(() => {
    if (lib)
      api
        .listPhotos(lib.id)
        .then((ps) => setSample(ps.filter((p) => !p.isVideo).slice(0, 8)))
        .catch(() => undefined);
  }, [lib]);

  const to = user?.email ?? email ?? 'you@example.com';
  const count = lib?.photoCount ?? 0;
  const until = lib ? fmtDate(lib.keptUntil) : '—';

  return (
    <div className="screen" style={{ padding: '32px 20px 60px', background: 'var(--surface-2)' }}>
      <div className="stack stack-12" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="micro muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Email mock · sent 7 days before deletion
        </div>
        <div
          className="stack stack-4 tiny muted"
          style={{
            background: '#fff',
            borderRadius: 6,
            padding: '14px 20px',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <span style={{ display: 'inline-block', width: 56 }}>From</span>
            <span style={{ color: 'var(--text)' }}>Printagram &lt;hello@printagram.app&gt;</span>
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 56 }}>To</span>
            <span style={{ color: 'var(--text)' }}>{to}</span>
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 56 }}>Subject</span>
            <span className="semibold" style={{ color: 'var(--text)' }}>
              Your photos are deleted in 7 days
            </span>
          </div>
        </div>
        <div
          className="stack stack-20"
          style={{
            background: 'var(--bg)',
            borderRadius: 6,
            padding: '36px 32px',
            border: '1px solid var(--border)',
          }}
        >
          <div className="serif semibold" style={{ fontSize: 20 }}>
            Printagram
          </div>
          <h2 className="h2" style={{ fontSize: 26, lineHeight: 1.2 }}>
            Still want your {count} photos? They'll be deleted on {until}.
          </h2>
          <p className="muted pretty">
            Three months ago you brought your Instagram photos into Printagram. As promised, we keep
            them for 3 months and then delete them. Making another book keeps them for 3 more
            months. Your ordered PDFs stay downloadable whatever you decide.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              maxWidth: 280,
            }}
          >
            {sample.map((p) => (
              <img
                key={p.id}
                src={p.thumbUrl}
                alt=""
                style={{ aspectRatio: '1', width: '100%', objectFit: 'cover', borderRadius: 3 }}
              />
            ))}
          </div>
          <div className="row row-wrap gap-10">
            <Button size="lg" style={{ padding: '14px 22px' }} onClick={() => nav('/books')}>
              Make another book
            </Button>
            <Button
              size="lg"
              variant="secondary"
              style={{ padding: '14px 22px' }}
              onClick={() => nav('/books?delete=1')}
            >
              Delete them now
            </Button>
          </div>
          <p className="tiny muted pretty">
            Nothing to do if you're happy to let them go. You're receiving this because you have a
            Printagram account.
          </p>
        </div>
      </div>
    </div>
  );
}
