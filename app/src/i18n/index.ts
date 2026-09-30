import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pickLang, normalizeLang, type Lang } from '@printagram/shared';
import { ApiClientError } from '@/services/api';
import { en, type Messages } from './en';
import { sv } from './sv';

export type { Messages };

const MESSAGES: Record<Lang, Messages> = { en, sv };

/** localStorage key of the saved language choice. */
export const LANG_STORAGE_KEY = 'printagram.lang';

export function browserLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  return pickLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

/**
 * UI language: the visitor's own choice once made, otherwise the browser language, otherwise
 * English. Kept apart from the draft so signing out does not reset it. Public pages take the
 * language from their URL instead (/sv/...) and save it as the choice (PublicLayout, boot.ts).
 */
export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: browserLang(),
      setLang: (lang) => set({ lang: normalizeLang(lang) }),
    }),
    { name: LANG_STORAGE_KEY, version: 1 },
  ),
);

function applyDocumentLang(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
applyDocumentLang(useLang.getState().lang);
useLang.subscribe((s) => applyDocumentLang(s.lang));

/** Whether the visitor has ever chosen a language (or visited a language-specific page). */
export function hasSavedLang(): boolean {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getLang(): Lang {
  return useLang.getState().lang;
}

/** Messages for non-React code (stores, services). */
export function getT(): Messages {
  return MESSAGES[getLang()];
}

/** Messages for the current UI language; re-renders when it changes. */
export function useT(): Messages {
  return MESSAGES[useLang((s) => s.lang)];
}

export function messagesFor(lang: Lang): Messages {
  return MESSAGES[lang];
}

/**
 * Text for an error shown to the user. API errors are translated by their code (per-call
 * overrides first), anything else falls back to its own message, then to a generic line.
 */
export function errorText(
  e: unknown,
  t: Messages,
  overrides: Partial<Record<string, string>> = {},
): string {
  if (e instanceof ApiClientError) {
    const byCode = overrides[e.code] ?? (t.errors.codes as Record<string, string>)[e.code];
    if (byCode) return byCode;
    if (getLang() !== 'en') return t.errors.generic;
  }
  if (e instanceof Error && e.message) return e.message;
  return t.errors.generic;
}
