import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import type { UploadErrorKind } from '@printagram/shared';
import { Banner, Button, Card, ProgressBar, ScreenHeader, Spinner } from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { api } from '@/services';
import { ExportImportError, importExportZip, type ImportSummary } from '@/services/exportImport';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { useLibrary } from '@/state/library';
import s from './upload.module.css';

type Up = 'idle' | 'reading' | 'uploading' | 'finishing' | 'done';

const ERRORS: Record<UploadErrorKind, { title: string; text: string; guide: boolean }> = {
  html: {
    title: 'This export is in HTML format',
    text: 'We need the JSON version to read your posts and dates. Request the export again and pick Format: JSON.',
    guide: true,
  },
  empty: {
    title: 'No posts in this export',
    text: "The file doesn't contain any posts. When requesting, make sure Posts is ticked under Your Instagram activity.",
    guide: true,
  },
  corrupt: {
    title: "We couldn't open this file",
    text: "It may be incomplete or the Instagram download link may have expired. Download it again from Instagram's email, or request a new export.",
    guide: false,
  },
  large: {
    title: 'File is too large',
    text: 'The upload limit is 8 GB. Try requesting the export in parts (by year), or with Media quality: Medium.',
    guide: true,
  },
  unsupported: {
    title: "Some photos use a format we can't read",
    text: 'Those photos were skipped. Everything else was imported. Instagram exports normally contain JPEG and WebP files only.',
    guide: false,
  },
  generic: {
    title: 'Something went wrong',
    text: 'We could not import this file. Please try again, and if it keeps failing, request a new export.',
    guide: false,
  },
};

function fmtSize(bytes: number): string {
  return bytes > 1e9
    ? `${(bytes / 1e9).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

const one = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);

export function Upload() {
  const nav = useNavigate();
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
    setFileName(files.length === 1 ? files[0]!.name : `${files.length} files`);
    setFileSize(fmtSize(files.reduce((n, f) => n + f.size, 0)));
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

  const e = err ? ERRORS[err] : null;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const notes: string[] = [];
  if (summary) {
    if (summary.alreadyThere > 0)
      notes.push(
        `${summary.alreadyThere} ${one(summary.alreadyThere, 'was', 'were')} already in your library`,
      );
    if (summary.missing > 0)
      notes.push(
        `${summary.missing} ${one(summary.missing, 'is', 'are')} in a part of the export you didn't add — drop all the ZIP parts together`,
      );
    if (summary.unsupported > 0)
      notes.push(
        `${summary.unsupported} ${one(summary.unsupported, 'uses', 'use')} a format we can't print`,
      );
    if (summary.failed > 0) notes.push(`${summary.failed} could not be read or uploaded`);
  }

  return (
    <div className="screen screen--padded">
      <ScreenHeader
        title="Upload your Instagram export"
        onBack={() => nav(adding ? '/start' : '/export/waiting')}
      >
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
              <div className="h3">Drop the ZIP here</div>
              <div className="muted pretty" style={{ fontSize: 15, maxWidth: '40ch' }}>
                The file Instagram sent you, as is. No need to unzip it. Usually named{' '}
                <span className="mono tiny">instagram-yourname-….zip</span>. Got several parts? Drop
                them all at once.
              </div>
              <span className={s.choose}>Or choose files</span>
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
                    Show the export steps again
                  </Button>
                )}
              </Banner>
            )}
          </>
        )}

        {up === 'reading' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">Reading your export…</div>
            <div className="small muted">
              {fileName} · {fileSize}. Looking for your posts — nothing is uploaded yet.
            </div>
          </Card>
        )}

        {up === 'uploading' && (
          <Card bordered radius="2xl" pad="hero">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <div className="semibold">
                Adding photos · {progress.done} of {progress.total}
              </div>
              <div className="small muted">{pct}%</div>
            </div>
            <ProgressBar pct={pct} />
            <div className="row between gap-12 row-wrap">
              <div className="small muted">Only your photos are uploaded · keep this tab open</div>
              <Button size="sm" variant="secondary" onClick={() => abort.current?.abort()}>
                Stop here
              </Button>
            </div>
          </Card>
        )}

        {up === 'finishing' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">Finishing up…</div>
            <div className="small muted">Sorting your photos by date.</div>
          </Card>
        )}

        {up === 'done' && summary && (
          <Card bordered radius="2xl" pad="hero" center gap={16}>
            <div className="check check--done">✓</div>
            <div>
              <div className="h3">
                {adding || summary.alreadyThere > 0
                  ? `Added ${summary.added} new photo${summary.added === 1 ? '' : 's'}`
                  : `Found ${summary.added} photos from ${summary.years}`}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {summary.posts} posts · {summary.carousels} carousels · {summary.videos} videos
                skipped{summary.cancelled ? ' · stopped early' : ''}
              </div>
              {notes.length > 0 && (
                <div className="small muted pretty" style={{ marginTop: 6 }}>
                  Of the photos in your export: {notes.join('; ')}.
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
                  <span>
                    Your export also has {summary.archivedAvailable} archived post
                    {summary.archivedAvailable === 1 ? '' : 's'}.
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    // Not incremental: archived posts are usually older than the newest one
                    // imported. Photos already in the library are still skipped.
                    onClick={() => run(lastFiles.current, true, false)}
                  >
                    {summary.archivedAvailable === 1 ? 'Add it too' : 'Add them too'}
                  </Button>
                </div>
              </Banner>
            )}
            <Button
              size="xl"
              style={{ width: '100%', maxWidth: 320 }}
              onClick={() => nav(adding ? '/books' : '/select')}
            >
              {adding ? 'Back to My books' : 'Choose photos'}
            </Button>
          </Card>
        )}

        <div
          className="row gap-10 tiny muted"
          style={{ alignItems: 'flex-start', padding: '0 4px' }}
        >
          <span className="check">✓</span>
          <span>
            Your photos are stored only to build your books, kept for 3 months, and deletable by you
            at any time. We never see your Instagram login.
          </span>
        </div>
      </div>
    </div>
  );
}
