import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import type { Lang, UploadErrorKind } from '@printagram/shared';
import {
  Banner,
  Button,
  Card,
  ProgressBar,
  ScreenHeader,
  Spinner,
  WizardBar,
} from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { api } from '@/services';
import { ExportImportError, importExportZip, type ImportSummary } from '@/services/exportImport';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { useLibrary } from '@/state/library';
import { useLang, useT } from '@/i18n';
import s from './upload.module.css';

type Up = 'idle' | 'reading' | 'uploading' | 'finishing' | 'done';

/** Errors that are fixed by requesting the export again show a link back to the guide. */
const GUIDE_ERRORS: Record<UploadErrorKind, boolean> = {
  html: true,
  empty: true,
  corrupt: false,
  large: true,
  unsupported: false,
  generic: false,
};

function fmtSize(bytes: number, lang: Lang): string {
  const s =
    bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
  return lang === 'sv' ? s.replace('.', ',') : s;
}

export function Upload() {
  const nav = useNavigate();
  const t = useT();
  const u = t.exportFlow.upload;
  const lang = useLang((x) => x.lang);
  const adding = useDraft((d) => d.adding);
  const setSource = useDraft((d) => d.setSource);
  const startLibrary = useDraft((d) => d.startLibrary);
  const ensureSession = useSession((x) => x.ensureSession);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const setPhotos = useLibrary((l) => l.setPhotos);

  const [up, setUp] = useState<Up>('idle');
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<UploadErrorKind | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const lastFiles = useRef<File[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setSource('export');
  }, [setSource]);

  useEffect(() => () => abort.current?.abort(), []);

  // Leaving the page mid-upload would stop the import; ask first.
  useEffect(() => {
    if (up !== 'reading' && up !== 'uploading') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [up]);

  const finish = async (summ: ImportSummary) => {
    const lib = summ.library;
    const photos = await api.listPhotos(lib.id);
    setPhotos(lib.id, lib, photos);
    startLibrary(lib.id, photos, { keepSelection: adding });
    await refreshLibraries();
    setSample(
      photos
        .filter((p) => !p.isVideo)
        .slice(0, 16)
        .map((p) => p.thumbUrl),
    );
    setSummary(summ);
    setUp('done');
  };

  const run = async (files: File[], includeArchived = false, incremental = adding) => {
    if (files.length === 0) return;
    lastFiles.current = files;
    setErr(null);
    setFileName(files.length === 1 ? files[0]!.name : u.files(files.length));
    setFileSize(
      fmtSize(
        files.reduce((n, f) => n + f.size, 0),
        lang,
      ),
    );
    setUp('reading');
    setProgress({ done: 0, total: 0 });
    abort.current = new AbortController();
    try {
      await ensureSession();
      const summ = await importExportZip(files, api, {
        incremental,
        includeArchived,
        signal: abort.current.signal,
        onProgress: (e) => {
          if (e.phase === 'reading') setUp('reading');
          else if (e.phase === 'uploading') {
            setUp('uploading');
            setProgress({ done: e.done, total: e.total });
          } else setUp('finishing');
        },
      });
      await finish(summ);
    } catch (e) {
      if (e instanceof ExportImportError) console.warn(`import rejected: ${e.kind}`);
      else console.error(e);
      setErr(e instanceof ExportImportError ? e.kind : 'generic');
      setUp('idle');
    }
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDrag(false);
    void run([...e.dataTransfer.files]);
  };

  const e = err ? { ...u.errors[err], guide: GUIDE_ERRORS[err] } : null;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const notes: string[] = [];
  if (summary) {
    if (summary.alreadyThere > 0) notes.push(u.notes.alreadyThere(summary.alreadyThere));
    if (summary.missing > 0) notes.push(u.notes.missing(summary.missing));
    if (summary.unsupported > 0) notes.push(u.notes.unsupported(summary.unsupported));
    if (summary.failed > 0) notes.push(u.notes.failed(summary.failed));
  }

  return (
    <div className="screen screen--bar">
      <ScreenHeader title={u.title}>
        <FlowProgress screen="upload" />
      </ScreenHeader>
      <div className="container container--narrow stack stack-18" style={{ paddingTop: 8 }}>
        {up === 'idle' && (
          <>
            <label
              className={`${s.drop} ${drag ? s['drop--over'] : ''}`}
              onDragOver={(ev) => {
                ev.preventDefault();
                if (!drag) setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <div className={s.dropIcon}>↑</div>
              <div className="h3">{u.dropTitle}</div>
              <div className="muted pretty" style={{ fontSize: 15, maxWidth: '40ch' }}>
                {u.dropBefore} <span className="mono tiny">{u.dropFileName}</span>
                {u.dropAfter}
              </div>
              <span className={s.choose}>{u.chooseFiles}</span>
              <input
                type="file"
                multiple
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(ev) => {
                  void run([...(ev.target.files ?? [])]);
                  ev.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>
            {e && (
              <Banner tone="error" title={e.title} className={s.err}>
                <div>{e.text}</div>
                {e.guide && (
                  <Button
                    size="sm"
                    variant="danger-outline"
                    style={{ alignSelf: 'flex-start', marginTop: 6 }}
                    onClick={() => nav('/export')}
                  >
                    {u.showSteps}
                  </Button>
                )}
              </Banner>
            )}
          </>
        )}

        {up === 'reading' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">{u.reading}</div>
            <div className="small muted">{u.readingDetail(fileName, fileSize)}</div>
          </Card>
        )}

        {up === 'uploading' && (
          <Card bordered radius="2xl" pad="hero">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <div className="semibold">{u.adding(progress.done, progress.total)}</div>
              <div className="small muted">{pct}%</div>
            </div>
            <ProgressBar pct={pct} />
            <div className="row between gap-12 row-wrap">
              <div className="small muted">{u.keepOpen}</div>
              <Button size="sm" variant="secondary" onClick={() => abort.current?.abort()}>
                {u.stop}
              </Button>
            </div>
          </Card>
        )}

        {up === 'finishing' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">{u.finishing}</div>
            <div className="small muted">{u.sorting}</div>
          </Card>
        )}

        {up === 'done' && summary && (
          <Card bordered radius="2xl" pad="hero" center gap={16}>
            <div className="check check--done">✓</div>
            <div>
              <div className="h3">
                {adding || summary.alreadyThere > 0
                  ? u.added(summary.added)
                  : u.found(summary.added, summary.years)}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {u.stats(summary.posts, summary.carousels, summary.videos, summary.cancelled)}
              </div>
              {notes.length > 0 && (
                <div className="small muted pretty" style={{ marginTop: 6 }}>
                  {u.notes.intro(notes.join('; '))}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 4,
                width: '100%',
                maxWidth: 400,
              }}
            >
              {sample.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{ aspectRatio: '1', borderRadius: 4, width: '100%', objectFit: 'cover' }}
                />
              ))}
            </div>
            {summary.archivedAvailable > 0 && (
              <Banner tone="info" tight>
                <div className="row between gap-12 row-wrap">
                  <span>{u.archived(summary.archivedAvailable)}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    // Not incremental: archived posts are usually older than the newest one
                    // imported. Photos already in the library are still skipped.
                    onClick={() => run(lastFiles.current, true, false)}
                  >
                    {summary.archivedAvailable === 1 ? u.addIt : u.addThem}
                  </Button>
                </div>
              </Banner>
            )}
            <Button
              size="xl"
              style={{ width: '100%', maxWidth: 320 }}
              onClick={() => nav(adding ? '/books' : '/select')}
            >
              {adding ? u.backToBooks : u.choosePhotos}
            </Button>
          </Card>
        )}

        <div
          className="row gap-10 tiny muted"
          style={{ alignItems: 'flex-start', padding: '0 4px' }}
        >
          <span className="check">✓</span>
          <span>{u.privacy}</span>
        </div>
      </div>
      <WizardBar onBack={() => nav(adding ? '/start' : '/export/waiting')} />
    </div>
  );
}
