import { photoSourceFromId } from '@printagram/shared';
import { libraries, orders, type LibraryRow } from '../core.js';
import type { OrderLike } from './views.js';

/**
 * Orders from before `source` was snapshotted get it filled in: from the library row if it still
 * exists (expired libraries keep their row), else from the photo id prefix, else null. A found
 * answer is written back once so the next read is free.
 */
export async function withSource<T extends OrderLike & { photoIds?: string[] }>(
  o: T,
  cache: Map<string, LibraryRow | null>,
): Promise<T> {
  if (o.source !== undefined && o.source !== null) return o;
  const key = `${o.userId}/${o.libraryId}`;
  let lib = cache.get(key);
  if (lib === undefined) {
    lib = o.libraryId ? await libraries.get(o.userId, o.libraryId) : null;
    cache.set(key, lib);
  }
  const source = lib?.source ?? photoSourceFromId(o.coverPhotoId ?? o.photoIds?.[0]);
  if (!source) return o;
  const sourceLabel = lib?.sourceLabel ?? null;
  await orders.merge(o.userId, o.orderId, { source, sourceLabel });
  return { ...o, source, sourceLabel };
}
