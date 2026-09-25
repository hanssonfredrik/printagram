import type { AppConfig, Book, LibrarySummary, Order, Photo, UserInfo } from '@printagram/shared';
import {
  ApiClientError,
  type Api,
  type ImportProgress,
  type InstagramStatus,
  type MeResult,
  type OrderCreateResult,
  type PdfUploadTarget,
  type PromoApplyResult,
  type RegisterResult,
  type ShareInfo,
} from './api';

const BASE = '/api';

interface ReadSas {
  baseUrl: string;
  sas: string;
  expiresAt: string;
}

const readSasCache = new Map<string, ReadSas>();

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? res.statusText,
      res.status,
    );
  }
  return data as T;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const patch = <T>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {});
const del = <T>(p: string) => request<T>('DELETE', p);

function withSas(read: ReadSas | undefined, blob: string): string {
  if (!read || !blob) return '';
  if (/^https?:/.test(blob) || blob.startsWith('blob:') || blob.startsWith('data:')) return blob;
  return `${read.baseUrl}/${blob}?${read.sas}`;
}

async function putBlob(
  url: string,
  body: Blob | Uint8Array,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-ms-blob-content-type', contentType);
    xhr.setRequestHeader('x-ms-blob-cache-control', 'public, max-age=31536000, immutable');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiClientError('UPLOAD_FAILED', `Upload failed (${xhr.status})`, xhr.status));
    xhr.onerror = () => reject(new ApiClientError('UPLOAD_FAILED', 'Upload failed (network)', 0));
    xhr.send(body instanceof Blob ? body : new Blob([body as BlobPart], { type: contentType }));
  });
}

async function fetchLibraryRead(
  id: string,
): Promise<{ library: LibrarySummary; read: ReadSas | null }> {
  const r = await get<{ library: LibrarySummary; read: ReadSas | null }>(`/libraries/${id}`);
  if (r.read) readSasCache.set(id, r.read);
  return r;
}

export const realApi: Api = {
  mode: 'real',

  getConfig: () => get<AppConfig>('/config'),

  ensureSession: () => post<MeResult>('/session/anonymous'),

  async me() {
    const r = await get<{ user: MeResult['user'] | null; libraries: MeResult['libraries'] }>('/me');
    return r.user ? { user: r.user, libraries: r.libraries } : null;
  },

  register: (email, password) => post<UserInfo>('/auth/register', { email, password }),
  login: (email, password, mergeFrom = false) =>
    post<UserInfo>('/auth/login', { email, password, mergeFrom }),
  logout: () => post<void>('/auth/logout'),
  forgotPassword: (email) => post<void>('/auth/forgot', { email }),
  resetPassword: (token, password) => post<UserInfo>('/auth/reset', { token, password }),
  sendReturnLink: (email, resumeTo) => post<void>('/auth/return-link', { email, resumeTo }),
  consumeMagicLink: (token) => post<{ user: UserInfo; resumeTo: string }>('/auth/magic', { token }),
  sendExportSteps: (email) => post<void>('/auth/export-steps', { email }),
  deleteAccount: () => del<void>('/account'),

  listLibraries: () => get<LibrarySummary[]>('/libraries'),
  async getLibrary(id) {
    return (await fetchLibraryRead(id)).library;
  },
  async listPhotos(libraryId) {
    if (!readSasCache.has(libraryId)) await fetchLibraryRead(libraryId);
    const read = readSasCache.get(libraryId);
    const out: Photo[] = [];
    let cursor: string | null = null;
    do {
      const page: { photos: Photo[]; cursor: string | null } = await get(
        `/libraries/${libraryId}/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      for (const p of page.photos)
        out.push({ ...p, origUrl: withSas(read, p.origUrl), thumbUrl: withSas(read, p.thumbUrl) });
      cursor = page.cursor;
    } while (cursor);
    return out;
  },
  deleteLibrary: (id) => del<void>(`/libraries/${id}`),
  createExportLibrary: (fileName) =>
    post<LibrarySummary>('/libraries', { source: 'export', label: fileName }),
  registerPhotos: (libraryId, items, incremental) =>
    post<RegisterResult[]>(`/libraries/${libraryId}/photos/register`, { items, incremental }),
  async uploadPhotoBlobs(_libraryId, target, orig, thumb) {
    if (!target.origPutUrl || !target.thumbPutUrl) return;
    await Promise.all([
      putBlob(target.origPutUrl, orig, orig.type || 'image/jpeg'),
      putBlob(target.thumbPutUrl, thumb, 'image/jpeg'),
    ]);
  },
  confirmPhotos: (libraryId, photoIds) =>
    post<void>(`/libraries/${libraryId}/photos/confirm`, { photoIds }),
  completeImport: (libraryId, fileName) =>
    post<LibrarySummary>(`/libraries/${libraryId}/imports/complete`, { label: fileName }),

  async instagramStartUrl() {
    return (await get<{ url: string }>('/instagram/start')).url;
  },
  instagramStatus: () => get<InstagramStatus>('/instagram/status'),
  startInstagramImport: (libraryId) =>
    post<{ jobId: string; libraryId: string }>(`/libraries/${libraryId}/imports`),
  runInstagramImport: (jobId) => post<ImportProgress>(`/imports/${jobId}/run`),
  disconnectInstagram: () => post<void>('/instagram/disconnect'),

  listBooks: () => get<Book[]>('/books'),
  saveDraft: ({ id, libraryId, settings, photoIds }) =>
    id
      ? patch<Book>(`/books/${id}`, { ...settings, photoIds, libraryId })
      : post<Book>('/books', { ...settings, photoIds, libraryId }),
  getBook: (id) => get<Book>(`/books/${id}`),
  duplicateBook: (id) => post<Book>(`/books/${id}/duplicate`),
  deleteBook: (id) => del<void>(`/books/${id}`),

  createOrder: (bookId) => post<OrderCreateResult>('/orders', { bookId }),
  getOrder: (id) => get<Order>(`/orders/${id}`),
  syncOrder: (id) => post<Order>(`/orders/${id}/sync`),
  payTest: (id, card) => post<Order>(`/orders/${id}/pay-test`, { card }),
  applyPromo: (id, code) => post<PromoApplyResult>(`/orders/${id}/promo`, { code }),
  confirmFree: (id) => post<Order>(`/orders/${id}/confirm-free`),
  listOrders: () => get<Order[]>('/orders'),
  async getPdfUploadTarget(orderId, regenerate = false) {
    const t = await post<PdfUploadTarget & { read: ReadSas | null }>(
      `/orders/${orderId}/pdf/upload-url`,
      { regenerate },
    );
    const read = t.read ?? undefined;
    return {
      ...t,
      photos: t.photos.map((p) => ({
        ...p,
        origUrl: withSas(read, p.origUrl),
        thumbUrl: withSas(read, p.thumbUrl),
      })),
    };
  },
  uploadPdf: (target, pdf, onProgress) =>
    putBlob(target.putUrl, pdf, 'application/pdf', onProgress),
  completePdf: (orderId, version, bytes, pages) =>
    post<Order>(`/orders/${orderId}/pdf/complete`, { version, bytes, pages }),
  async downloadUrl(orderId) {
    return (await get<{ url: string }>(`/orders/${orderId}/download-url`)).url;
  },
  getShare: (token) => get<ShareInfo>(`/share/${token}`),
};
