import type { PdfJob, PdfOut } from '@/workers/pdf.worker';

export interface PdfProgress {
  stage: 'fonts' | 'images' | 'pages' | 'saving';
  pct: number;
}

const FONT_URLS = { serif: '/fonts/Lora-Medium.ttf', sans: '/fonts/AlbertSans.ttf' };

/** Generates the book PDF in a Web Worker and resolves with the bytes. */
export function generatePdf(
  job: Omit<PdfJob, 'fontUrls'>,
  onProgress?: (p: PdfProgress) => void,
): Promise<{ bytes: Uint8Array; pages: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (ev: MessageEvent<PdfOut>) => {
      const m = ev.data;
      if (m.type === 'progress') {
        const base =
          m.stage === 'fonts' ? 0 : m.stage === 'images' ? 5 : m.stage === 'pages' ? 80 : 95;
        const span =
          m.stage === 'fonts' ? 5 : m.stage === 'images' ? 75 : m.stage === 'pages' ? 15 : 5;
        onProgress?.({ stage: m.stage, pct: base + (m.total ? (m.done / m.total) * span : 0) });
      } else if (m.type === 'done') {
        worker.terminate();
        resolve({ bytes: m.bytes, pages: m.pages });
      } else {
        worker.terminate();
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    const fontUrls = {
      serif: new URL(FONT_URLS.serif, window.location.origin).href,
      sans: new URL(FONT_URLS.sans, window.location.origin).href,
    };
    worker.postMessage({ ...job, fontUrls } satisfies PdfJob);
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
