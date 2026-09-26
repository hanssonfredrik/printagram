import type { PdfJob, PdfOut } from '@/workers/pdf.worker';

export interface PdfProgress {
  stage: 'fonts' | 'images' | 'pages' | 'saving';
  pct: number;
}

const ASSETS = {
  serif: '/fonts/Lora-Medium.ttf',
  sans: '/fonts/AlbertSans.ttf',
  fallback: '/fonts/NotoSans-Regular.ttf',
  emoji: '/fonts/NotoEmoji-Regular.ttf',
  icc: '/icc/sRGB.icc',
};

export class PdfError extends Error {
  constructor(
    message: string,
    public failedPhotos: string[] = [],
  ) {
    super(message);
    this.name = 'PdfError';
  }
}

/**
 * Generates the book PDF in a Web Worker and resolves with the bytes.
 * Aborting the signal terminates the worker immediately (e.g. when the user leaves the page).
 */
export function generatePdf(
  job: Omit<PdfJob, 'assetUrls'>,
  onProgress?: (p: PdfProgress) => void,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; pages: number }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    });
    const stop = () => {
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      stop();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort);
    worker.onmessage = (ev: MessageEvent<PdfOut>) => {
      const m = ev.data;
      if (m.type === 'progress') {
        const [base, span] =
          m.stage === 'fonts'
            ? [0, 5]
            : m.stage === 'images'
              ? [5, 75]
              : m.stage === 'pages'
                ? [80, 15]
                : [95, 5];
        onProgress?.({ stage: m.stage, pct: base + (m.total ? (m.done / m.total) * span : 0) });
      } else if (m.type === 'done') {
        stop();
        resolve({ bytes: m.bytes, pages: m.pages });
      } else {
        stop();
        reject(new PdfError(m.message, m.failedPhotos));
      }
    };
    worker.onerror = (e) => {
      stop();
      reject(
        new PdfError(
          e.message ||
            (job.lang === 'sv' ? 'PDF:en kunde inte skapas.' : 'The PDF could not be created.'),
        ),
      );
    };
    const abs = (p: string) => new URL(p, window.location.origin).href;
    const assetUrls = {
      serif: abs(ASSETS.serif),
      sans: abs(ASSETS.sans),
      fallback: abs(ASSETS.fallback),
      emoji: abs(ASSETS.emoji),
      icc: abs(ASSETS.icc),
    };
    worker.postMessage({ ...job, assetUrls } satisfies PdfJob);
  });
}

export function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'book'
  );
}
