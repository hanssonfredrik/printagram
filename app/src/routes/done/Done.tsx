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
import { errorText, getT, useLang, useT } from '@/i18n';

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
  const t = useT();
  const td = t.done;
  const lang = useLang((x) => x.lang);
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
            dateSpan: photoSpan(photos, target.book.lang),
            bleedMm: target.bleedMm,
            lang: target.book.lang,
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
        setMsg(errorText(e, getT()));
      }
    },
    [refreshLibraries],
  );

  // produce and this effect read messages with getT(), so switching language does not restart them.
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
          setMsg(getT().done.notConfirmed);
        }
      } catch (e) {
        setStage('error');
        setMsg(errorText(e, getT()));
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
    const name = `inbunden-${slugify(order.title)}.pdf`;
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
        setMsg(errorText(e, t));
      }
    }
  };

  const [rotating, setRotating] = useState(false);
  const [rotated, setRotated] = useState(false);
  const newShareLink = async () => {
    if (!order) return;
    setRotating(true);
    try {
      const shareToken = await api.rotateShare(order.id);
      setOrder({ ...order, shareToken });
      setRotated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setRotating(false);
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
    d.setSource('library');
    d.setAdding(false);
    nav('/select');
  };

  if (!orderId) {
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="stack stack-16 center" style={{ maxWidth: 400 }}>
          <h2 className="h2">{td.noOrder}</h2>
          <Button to="/books">{td.myBooks}</Button>
        </div>
      </div>
    );
  }

  const busy =
    stage === 'loading' ||
    stage === 'waiting-payment' ||
    stage === 'generating' ||
    stage === 'uploading';
  const formatLabel = order?.format === 'portrait' ? td.portrait : td.square;
  const emailShown = user?.email || d.email || td.yourEmail;

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
                {stage === 'waiting-payment' ? td.confirming : td.making}
              </h2>
              <p className="muted">
                {stage === 'generating' && td.generating}
                {stage === 'uploading' && td.uploading}
                {stage === 'waiting-payment' && td.waitingPayment}
                {stage === 'loading' && td.loading}
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
            <h2 className="h2">{td.refundedTitle}</h2>
            <p className="muted">{td.refundedBody}</p>
            <Button block size="xl" to="/books">
              {td.myBooks}
            </Button>
          </>
        ) : stage === 'failed' ? (
          <>
            <h2 className="h2">{td.failedTitle}</h2>
            {order?.failureReason && (
              <Banner tone="error" tight>
                {order.failureReason}
              </Banner>
            )}
            <p className="muted">{td.failedBody}</p>
            <Button block size="xl" onClick={() => nav('/checkout')}>
              {td.backToCheckout}
            </Button>
          </>
        ) : stage === 'error' ? (
          <>
            <h2 className="h2">{td.errorTitle}</h2>
            <Banner tone="error" tight>
              {msg}
            </Banner>
            {order && (
              <Button block size="xl" onClick={() => produce(order, order.status === 'ready')}>
                {td.tryAgain}
              </Button>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="h2" style={{ marginBottom: 6 }}>
                {td.readyTitle}
              </h2>
              <p className="muted">
                {td.readySummary(order?.pageCount ?? 0, formatLabel, emailShown)}
              </p>
            </div>
            <Button block size="xl" onClick={download}>
              {downloaded ? td.downloadAgain : td.download}
            </Button>
            <div className="row gap-10" style={{ width: '100%' }}>
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1, padding: 12 }}
                onClick={share}
                disabled={!order?.shareToken}
              >
                {shared ? td.linkCopied : td.share}
              </Button>
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1, padding: 12 }}
                onClick={startOver}
              >
                {td.another}
              </Button>
            </div>
            {order?.shareToken && (
              <div className="tiny muted center">
                {td.shareNote}{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={newShareLink}
                  disabled={rotating}
                >
                  {rotated ? td.newLinkMade : td.newLink}
                </button>
              </div>
            )}
            <Card
              bordered
              pad="mid"
              gap={10}
              style={{ width: '100%', textAlign: 'left', padding: '16px 18px' }}
            >
              <div className="row between row-wrap gap-12" style={{ alignItems: 'baseline' }}>
                <div className="semibold">{td.libraryTitle}</div>
                <div className="tiny muted">{td.photos(library?.photoCount ?? 0)}</div>
              </div>
              {library && !libraryDeleted ? (
                <div className="small muted pretty">
                  {td.keptUntilBefore}{' '}
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                    {fmtDate(library.keptUntil, lang)}
                  </span>{' '}
                  {td.keptUntilAfter}
                </div>
              ) : (
                <div className="small muted">{td.libraryDeleted}</div>
              )}
              <div className="row row-wrap gap-8">
                <Button size="sm" variant="secondary" to="/books">
                  {td.myBooks}
                </Button>
                {library && !libraryDeleted && (
                  <Button size="sm" variant="danger-ghost" onClick={() => nav('/books?delete=1')}>
                    {td.deleteNow}
                  </Button>
                )}
              </div>
            </Card>
            <p className="tiny muted">{td.printNote}</p>
          </>
        )}
      </div>
    </div>
  );
}
