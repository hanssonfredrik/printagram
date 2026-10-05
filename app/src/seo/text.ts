/** `[text](pageKey)` or `[text](pageKey#hash)` in copy: a link to a public page (components/Rich). */
export const LINK_MARKUP = /\[([^\]]+)\]\(([A-Za-z]+)(?:#([\w-]+))?\)/g;

/** Copy with its link markup removed, for meta tags, JSON-LD and llms.txt. */
export function plainText(text: string): string {
  return text.replace(LINK_MARKUP, '$1');
}

/**
 * A piece of public copy that is only true while a feature flag is on (or off), so the pages
 * and their JSON-LD follow /api/config instead of going stale when a flag changes.
 */
export type Feature = 'connect' | 'noConnect' | 'googlePhotos' | 'noGooglePhotos';

export interface FeatureFlags {
  connectEnabled: boolean;
  googlePhotosEnabled: boolean;
}

export function featureOn(when: Feature | undefined, cfg: FeatureFlags): boolean {
  switch (when) {
    case undefined:
      return true;
    case 'connect':
      return cfg.connectEnabled;
    case 'noConnect':
      return !cfg.connectEnabled;
    case 'googlePhotos':
      return cfg.googlePhotosEnabled;
    case 'noGooglePhotos':
      return !cfg.googlePhotosEnabled;
  }
}

/** Copy items (FAQ entries, bullets) that apply under the current flags. */
export function forFlags<T extends { when?: Feature }>(items: T[], cfg: FeatureFlags): T[] {
  return items.filter((i) => featureOn(i.when, cfg));
}

export interface Faq {
  q: string;
  /** May contain `[text](pageKey)` links and `{price}`. */
  a: string;
  when?: Feature;
}
