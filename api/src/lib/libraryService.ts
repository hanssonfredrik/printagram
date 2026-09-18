import { config } from './config.js';
import { deleteContainer, ensureContainer, libContainerName } from './blobs.js';
import { addDays, newId, nowIso } from './ids.js';
import { books, importJobs, libraries, lookups, photos, type LibraryRow } from './tables.js';

/** Extends the retention window: max(existing, now) + retentionDays. */
export function extendedExpiry(l: LibraryRow | null): string {
  const base = new Date(Math.max(Date.now(), l ? new Date(l.expiresAt).getTime() : 0));
  return addDays(base, config.retentionDays).toISOString();
}

export async function createLibrary(
  userId: string,
  source: 'instagram' | 'export',
  label: string,
): Promise<LibraryRow> {
  const row: LibraryRow = {
    libraryId: newId(),
    userId,
    source,
    status: 'importing',
    photoCount: 0,
    sourceLabel: label,
    importedAt: nowIso(),
    lastImportAt: nowIso(),
    newestMediaAt: null,
    expiresAt: addDays(new Date(), config.retentionDays).toISOString(),
    reminderSentAt: null,
    igUserId: null,
    igUsername: null,
    igTokenEnc: null,
    igTokenExpiresAt: null,
    igTokenInvalid: false,
    igConnected: false,
  };
  await ensureContainer(libContainerName(row.libraryId));
  await libraries.upsert(row);
  return row;
}

/** Recounts photos and marks the library ready; extends retention. */
export async function finalizeImport(l: LibraryRow, label?: string): Promise<LibraryRow> {
  const rows = await photos.listAll(l.libraryId);
  const ready = rows.filter((p) => p.status === 'ready');
  const newest = ready.reduce<string | null>(
    (acc, p) => (!acc || p.takenAt > acc ? p.takenAt : acc),
    l.newestMediaAt,
  );
  const patch: Partial<LibraryRow> = {
    status: 'ready',
    photoCount: ready.filter((p) => !p.isVideo).length,
    newestMediaAt: newest,
    lastImportAt: nowIso(),
    expiresAt: extendedExpiry(l),
    reminderSentAt: null,
    ...(label ? { sourceLabel: label } : {}),
  };
  await libraries.merge(l.userId, l.libraryId, patch);
  return { ...l, ...patch } as LibraryRow;
}

/**
 * Deletes a library's blobs and photo rows. Drafts referencing it are removed; ordered books stay.
 * `keepRow` keeps the Library row with status=expired so "My books" can explain what happened.
 */
export async function destroyLibrary(l: LibraryRow, keepRow: boolean): Promise<void> {
  await libraries.merge(l.userId, l.libraryId, { status: 'deleting' });
  await deleteContainer(libContainerName(l.libraryId));
  await photos.deleteAll(l.libraryId);
  for (const b of await books.list(l.userId)) {
    if (b.libraryId === l.libraryId && b.status === 'draft') await books.delete(l.userId, b.bookId);
  }
  for (const j of await importJobs.list(l.userId)) {
    if (j.libraryId === l.libraryId) await importJobs.delete(l.userId, j.jobId);
  }
  if (l.igUserId) await lookups.delete('ig_user', l.igUserId);
  if (keepRow) {
    await libraries.merge(l.userId, l.libraryId, {
      status: 'expired',
      photoCount: 0,
      igTokenEnc: null,
      igConnected: false,
    });
  } else {
    await libraries.delete(l.userId, l.libraryId);
  }
}
