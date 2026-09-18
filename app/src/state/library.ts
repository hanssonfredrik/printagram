import { create } from 'zustand';
import type { LibrarySummary, Photo } from '@printagram/shared';
import { api } from '@/services';

interface LibraryState {
  libraryId: string | null;
  library: LibrarySummary | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  load: (
    libraryId: string,
    force?: boolean,
  ) => Promise<{ library: LibrarySummary; photos: Photo[] }>;
  setPhotos: (libraryId: string, library: LibrarySummary, photos: Photo[]) => void;
  clear: () => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  libraryId: null,
  library: null,
  photos: [],
  loading: false,
  error: null,

  async load(libraryId, force = false) {
    const cur = get();
    if (!force && cur.libraryId === libraryId && cur.library && cur.photos.length > 0) {
      return { library: cur.library, photos: cur.photos };
    }
    set({ loading: true, error: null });
    try {
      const [library, photos] = await Promise.all([
        api.getLibrary(libraryId),
        api.listPhotos(libraryId),
      ]);
      const sorted = [...photos].sort((a, b) =>
        a.takenAt < b.takenAt ? -1 : a.takenAt > b.takenAt ? 1 : a.carouselIdx - b.carouselIdx,
      );
      set({ libraryId, library, photos: sorted, loading: false });
      return { library, photos: sorted };
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load your photos.',
      });
      throw e;
    }
  },

  setPhotos(libraryId, library, photos) {
    set({ libraryId, library, photos, loading: false, error: null });
  },

  clear() {
    set({ libraryId: null, library: null, photos: [], loading: false, error: null });
  },
}));
