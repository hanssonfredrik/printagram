import { create } from 'zustand';
import type { AppConfig, LibrarySummary, UserInfo } from '@printagram/shared';
import {
  DEFAULT_PRICING,
  MAX_EXPORT_BYTES,
  MAX_PHOTOS_PER_BOOK,
  MAX_PHOTOS_PER_LIBRARY,
  normalizePricing,
} from '@printagram/shared';
import { api } from '@/services';
import { ApiClientError } from '@/services/api';
import { errorText, getT } from '@/i18n';

interface SessionState {
  ready: boolean;
  /** True once `config` is the real one: from /api/config or embedded in prerendered HTML. */
  configLoaded: boolean;
  user: UserInfo | null;
  config: AppConfig;
  libraries: LibrarySummary[];
  error: string | null;
  init: () => Promise<void>;
  ensureSession: () => Promise<UserInfo>;
  refreshLibraries: () => Promise<LibrarySummary[]>;
  setUser: (u: UserInfo | null) => void;
  setConfigOverride: (patch: Partial<AppConfig>) => void;
  signOut: () => Promise<void>;
}

const FALLBACK_CONFIG: AppConfig = {
  connectEnabled: false,
  googlePhotosEnabled: false,
  printedBooksEnabled: false,
  pricing: DEFAULT_PRICING,
  limits: {
    maxPhotosPerBook: MAX_PHOTOS_PER_BOOK,
    maxPhotosPerLibrary: MAX_PHOTOS_PER_LIBRARY,
    maxExportBytes: MAX_EXPORT_BYTES,
  },
  payment: { provider: 'fake', stripePublishableKey: null, testCards: [] },
  print: { bleedMm: 4 },
};

export const CONFIG_SCRIPT_ID = 'inbunden-config';

/**
 * The /api/config the prerender used, embedded in the static HTML (scripts/prerender.ts), so the
 * first render matches the prerendered page and React can hydrate it.
 */
function embeddedConfig(): AppConfig | null {
  try {
    const el = typeof document === 'undefined' ? null : document.getElementById(CONFIG_SCRIPT_ID);
    if (!el?.textContent) return null;
    const config = JSON.parse(el.textContent) as AppConfig;
    return { ...FALLBACK_CONFIG, ...config, pricing: normalizePricing(config.pricing) };
  } catch {
    return null;
  }
}

const EMBEDDED = embeddedConfig();

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  configLoaded: EMBEDDED !== null,
  user: null,
  config: EMBEDDED ?? FALLBACK_CONFIG,
  libraries: [],
  error: null,

  async init() {
    try {
      const [config, me] = await Promise.all([api.getConfig(), api.me()]);
      set({
        config: { ...config, pricing: normalizePricing(config.pricing) },
        configLoaded: true,
        user: me?.user ?? null,
        libraries: me?.libraries ?? [],
        ready: true,
        error: null,
      });
    } catch (e) {
      set({
        ready: true,
        error: e instanceof ApiClientError ? errorText(e, getT()) : getT().common.noServer,
      });
    }
  },

  async ensureSession() {
    const cur = get().user;
    if (cur) return cur;
    const me = await api.ensureSession();
    set({ user: me.user, libraries: me.libraries });
    return me.user;
  },

  async refreshLibraries() {
    const libraries = await api.listLibraries();
    set({ libraries });
    return libraries;
  },

  setUser(user) {
    set({ user });
  },

  setConfigOverride(patch) {
    set({ config: { ...get().config, ...patch } });
  },

  async signOut() {
    await api.logout();
    set({ user: null, libraries: [] });
  },
}));

export function useConfig() {
  return useSession((s) => s.config);
}
