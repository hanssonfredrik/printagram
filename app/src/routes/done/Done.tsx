import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { LibrarySummary, Order } from '@printagram/shared';
import { fmtDate, photoSpan } from '@printagram/shared';
import { Banner, Button, Card, ProgressBar } from '@/components/ui';
import { CoverThumb } from '@/components/PageRenderer';
import { ApiClientError, api } from '@/services';
import { generatePdf, downloadBytes, slugify } from '@/services/pdf';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { useLibrary } from '@/state/library';

type Stage =
  | 'loading'
  | 'waiting-payment'
  | 'generating'
  | 'uploading'
  | 'ready'
  | 'error'
  | 'failed'
  | 'refunded';

export function Done() {
  const nav = useNavigate();
  const { orderId: paramId } = useParams();
  const d = useDraft();
  const orderId = paramId ?? d.lastOrderId;
  const user = useSession((x) => x.user);
  const libraries = useSession((x) => x.libraries);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const clearLibrary = useLibrary((l) => l.clear);

  const [order, setOrder] = useState<Order | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);
  const localPdf = useRef<Uint8Array | null>(null);
  const started = useRef(false);
  const pdfAbort = useRef<AbortController | null>(null);

  // Leaving the page stops PDF generation (the worker is terminated, nothing half-uploaded).
  useEffect(() => () => pdfAbort.current?.abort(), []);

  // The library shown is the one this order was made from (not whatever the draft points at).
  const library: LibrarySummary | undefined = order
    ? libraries.find((l) => l.id === order.libraryId)
    : undefined;
  const libraryDeleted = !!order && (!library || library.status !== 'ready');
  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  const produce = useCallback(
    async (o: Order, regenerate = false) => {
      setStage('generating');
      setPct(0);
      try {
        const target = await api.getPdfUploadTarget(o.id, regenerate);
        const photos = target.photos;
        pdfAbort.current = new AbortController();
        const { bytes, pages } = await generatePdf(
          {
            photos,
            pages: target.book.pages,
            title: target.book.title,
            format: target.book.format,
            showMeta: target.book.showMeta,
            showLikes: libraryRef.current?.hasLikes ?? false,
            coverPhotoId: target.book.coverPhotoId,
            dateSpan: photoSpan(photos),
            bleedMm: target.bleedMm,
          },
          (p) => setPct(p.pct),
          pdfAbort.current.signal,
        );
        localPdf.current = bytes;
        setStage('uploading');
        setPct(0);
        await api.uploadPdf(target, bytes, (p) => setPct(p));
        const done = await api.completePdf(o.id, target.version, bytes.byteLength, pages);
        setOrder(done);
        setStage('ready');
        await refreshLibraries();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error(e);
        setStage('error');
        setMsg(e instanceof Error ? e.message : 'Could not create the PDF.');
      }
    },
    [refreshLibraries],
  );

  // Poll the order until paid (webhook) or use sync as a fallback, then produce the PDF.
  useEffect(() => {
    if (!orderId || started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      try {
        let o = await api.getOrder(orderId);
        if (o.status === 'created') {
          setStage('waiting-payment');
          for (let i = 0; i < 30 && o.status === 'created' && !cancelled; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            o = i % 3 === 2 ? await api.syncOrder(orderId) : await api.getOrder(orderId);
          }
        }
        if (cancelled) return;
        setOrder(o);
        if (o.status === 'paid') await produce(o);
        else if (o.status === 'ready') setStage('ready');
        else if (o.status === 'failed' || o.status === 'expired') setStage('failed');
        else if (o.status === 'refunded') setStage('refunded');
        else {
          setStage('error');
          setMsg('We could not confirm your payment yet. Refresh this page in a minute.');
        }
      } catch (e) {
        setStage('error');
        setMsg(e instanceof Error ? e.message : 'Could not load your order.');
      }
    })();
    return () => {
      // StrictMode runs effects twice in dev: let the second run take over.
      cancelled = true;
      started.current = false;
    };
  }, [orderId, produce]);

  const download = async () => {
    if (!order) return;
    const name = `printagram-${slugify(order.title)}.pdf`;
    try {
      if (localPdf.current) {
        downloadBytes(localPdf.current, name);
      } else {
        const url = await api.downloadUrl(order.id);
        window.location.assign(url);
      }
      setDownloaded(true);
    } catch (e) {
      // Only rebuild when the stored PDF is really missing; other errors are shown as they are.
      if (e instanceof ApiClientError && (e.code === 'PDF_MISSING' || e.status === 404)) {
        await produce(order, true);
        if (localPdf.current) downloadBytes(localPdf.current, name);
        setDownloaded(true);
      } else {
        setStage('error');
        setMsg(e instanceof Error ? e.message : 'Could not download the PDF.');
      }
    }
  };

  const share = async () => {
    if (!order?.shareToken) return;
    const url = `${window.location.origin}/s/${order.shareToken}`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent))
        await navigator.share({ title: order.title, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* user cancelled */
    }
  };

  const startOver = () => {
    d.resetForNewBook();
    clearLibrary();
    nav('/select');
  };

  if (!orderId) {
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="stack stack-16 center" style={{ maxWidth: 400 }}>
          <h2 className="h2">No order to show</h2>
          <Button to="/books">My books</Button>
        </div>
      </div>
    );
  }

  const busy =
    stage === 'loading' ||
    stage === 'waiting-payment' ||
    stage === 'generating' ||
    stage === 'uploading';
  const formatLabel = order?.format === 'portrait' ? 'Portrait' : 'Square';
  const emailShown = user?.email || d.email || 'your email';

  return (
    <div
      className="screen"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        className="stack stack-20"
        style={{ width: '100%', maxWidth: 440, alignItems: 'center', textAlign: 'center' }}
      >
        <div style={{ transform: 'rotate(-2deg)' }}>
          <CoverThumb
            src={order?.coverThumbUrl ?? undefined}
            format={order?.format ?? d.format}
            width={160}
            style={{
              boxShadow: '0 30px 60px -24px rgba(42,38,34,.45), 0 0 0 1px var(--border)',
              borderRadius: '4px 10px 10px 4px',
              padding: 0,
            }}
          />
        </div>

        {busy ? (
          <>
            <div>
              <h2 className="h2" style={{ marginBottom: 6 }}>
                {stage === 'waiting-payment' ? 'Confirming your payment…' : 'Making your book'}
              </h2>
              <p className="muted">
                {stage === 'generating' && 'Laying out every page at print resolution.'}
                {stage === 'uploading' && 'Saving your PDF to your account.'}
                {stage === 'waiting-payment' && 'This usually takes a few seconds.'}
                {stage === 'loading' && 'One moment.'}
              </p>
            </div>
            {(stage === 'generating' || stage === 'uploading') && (
              <div style={{ width: '100%' }} className="stack stack-8">
                <ProgressBar pct={pct} />
                <div className="tiny muted">{Math.round(pct)}%</div>
              </div>
            )}
          </>
        ) : stage === 'refunded' ? (
          <>
            <h2 className="h2">This order was refunded</h2>
            <p className="muted">The PDF is no longer available for this order.</p>
            <Button block size="xl" to="/books">
              My books
            </Button>
          </>
        ) : stage === 'failed' ? (
          <>
            <h2 className="h2">Payment didn't go through</h2>
            {order?.failureReason && (
              <Banner tone="error" tight>
                {order.failureReason}
              </Banner>
            )}
            <p className="muted">
              Nothing was charged. You can try again with another card or wallet.
            </p>
            <Button block size="xl" onClick={() => nav('/checkout')}>
              Back to checkout
            </Button>
          </>
        ) : stage === 'error' ? (
          <>
            <h2 className="h2">Something went wrong</h2>
            <Banner tone="error" tight>
              {msg}
            </Banner>
            {order && (
              <Button block size="xl" onClick={() => produce(order, order.status === 'ready')}>
                Try again
              </Button>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="h2" style={{ marginBottom: 6 }}>
                Your book is ready
              </h2>
              <p className="muted">
                {order?.pageCount} pages, {formatLabel}. {`We also sent the link to ${emailShown}.`}
              </p>
            </div>
            <Button block size="xl" onClick={download}>
              {downloaded ? 'Downloaded · Download again' : 'Download your PDF'}
            </Button>
            <div className="row gap-10" style={{ width: '100%' }}>
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1, padding: 12 }}
                onClick={share}
                disabled={!order?.shareToken}
              >
                {shared ? 'Link copied' : 'Share'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1, padding: 12 }}
                onClick={startOver}
              >
                Make another book
              </Button>
            </div>
            <Card
              bordered
              pad="mid"
              gap={10}
              style={{ width: '100%', textAlign: 'left', padding: '16px 18px' }}
            >
              <div className="row between row-wrap gap-12" style={{ alignItems: 'baseline' }}>
                <div className="semibold">Your photo library</div>
                <div className="tiny muted">{library?.photoCount ?? 0} photos</div>
              </div>
              {library && !libraryDeleted ? (
                <div className="small muted pretty">
                  Kept until{' '}
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                    {fmtDate(library.keptUntil)}
                  </span>{' '}
                  — this order extended it by 3 months. Make another book anytime without importing
                  again. We'll email you a week before it's deleted.
                </div>
              ) : (
                <div className="small muted">Deleted. Your PDF stays downloadable.</div>
              )}
              <div className="row row-wrap gap-8">
                <Button size="sm" variant="secondary" to="/books">
                  My books
                </Button>
                {library && !libraryDeleted && (
                  <Button size="sm" variant="danger-ghost" onClick={() => nav('/books?delete=1')}>
                    Delete photos now
                  </Button>
                )}
              </div>
            </Card>
            <p className="tiny muted">
              Print it at any print shop, or wait for shipped books — coming soon.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
