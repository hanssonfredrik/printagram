import type { PhotoSource } from './types.js';

/**
 * Photo ids carry their origin as a prefix: `ig_` (Instagram connect), `ex_` (export ZIP),
 * `gp_` (Google Photos). Used to tell where an order's photos came from when the library row
 * is gone.
 */
export const PHOTO_SOURCE_PREFIX: Record<string, PhotoSource> = {
  ig_: 'instagram',
  ex_: 'export',
  gp_: 'googlephotos',
};

export function photoSourceFromId(id: string | null | undefined): PhotoSource | null {
  if (!id) return null;
  return PHOTO_SOURCE_PREFIX[id.slice(0, 3)] ?? null;
}
