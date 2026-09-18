import { create } from 'zustand';
import { mockFlags, resetMockState } from '@/services/api.mock';
import { API_MODE } from '@/services';
import { useSession } from './session';
import { useDraft } from './draft';
import { useLibrary } from './library';

/** Dev-only demo controls; mirrors the demo strip of the design prototype. */
interface DemoState {
  visible: boolean;
  personal: boolean;
  empty: boolean;
  payFail: boolean;
  comingSoon: boolean;
  toggle: (k: 'personal' | 'empty' | 'payFail' | 'comingSoon') => void;
  reset: () => void;
  hide: () => void;
}

export const DEMO_ENABLED = import.meta.env.DEV || API_MODE === 'mock';

export const useDemo = create<DemoState>((set, get) => ({
  visible: DEMO_ENABLED,
  personal: false,
  empty: false,
  payFail: false,
  comingSoon: false,

  toggle(k) {
    const next = !get()[k];
    set({ [k]: next } as Partial<DemoState>);
    if (k === 'personal') mockFlags.connectOutcome = next ? 'personal' : 'ok';
    if (k === 'empty') mockFlags.emptyLibrary = next;
    if (k === 'payFail') mockFlags.payFails = next;
    if (k === 'comingSoon') {
      mockFlags.connectMode = next ? 'coming-soon' : 'live';
      useSession.getState().setConfigOverride({ connectEnabled: !next });
    }
  },

  reset() {
    set({ personal: false, empty: false, payFail: false, comingSoon: false });
    mockFlags.connectOutcome = 'ok';
    mockFlags.emptyLibrary = false;
    mockFlags.payFails = false;
    mockFlags.connectMode = 'live';
    if (API_MODE === 'mock') resetMockState();
    useDraft.getState().resetAll();
    useLibrary.getState().clear();
    void useSession.getState().init();
  },

  hide: () => set({ visible: false }),
}));
