import { ProgressSteps } from './ui';
import { useDraft, type FlowSource } from '@/state/draft';
import { useT, type Messages } from '@/i18n';

type Screen =
  | 'choose'
  | 'connect'
  | 'google'
  | 'guide'
  | 'waiting'
  | 'upload'
  | 'select'
  | 'preview'
  | 'checkout'
  | 'done';

export function progressFor(
  source: FlowSource | null,
  screen: Screen,
  t: Messages['common']['progress'],
): { labels: string[]; current: number } {
  if (source === 'connect' || (!source && ['choose', 'connect'].includes(screen))) {
    const labels = [t.connect, t.select, t.preview, t.checkout];
    const map: Record<Screen, number> = {
      choose: 0,
      connect: 0,
      google: 0,
      guide: 0,
      waiting: 0,
      upload: 0,
      select: 1,
      preview: 2,
      checkout: 3,
      done: 3,
    };
    return { labels, current: map[screen] };
  }
  if (source === 'google' || screen === 'google') {
    const labels = [t.google, t.select, t.preview, t.checkout];
    const map: Record<Screen, number> = {
      choose: 0,
      connect: 0,
      google: 0,
      guide: 0,
      waiting: 0,
      upload: 0,
      select: 1,
      preview: 2,
      checkout: 3,
      done: 3,
    };
    return { labels, current: map[screen] };
  }
  if (source === 'export' || ['guide', 'waiting', 'upload'].includes(screen)) {
    const labels = [t.export, t.upload, t.select, t.preview, t.checkout];
    const map: Record<Screen, number> = {
      choose: 0,
      connect: 0,
      google: 0,
      guide: 0,
      waiting: 0,
      upload: 1,
      select: 2,
      preview: 3,
      checkout: 4,
      done: 4,
    };
    return { labels, current: map[screen] };
  }
  const labels = [t.photos, t.select, t.preview, t.checkout];
  const map: Record<Screen, number> = {
    choose: 0,
    connect: 0,
    google: 0,
    guide: 0,
    waiting: 0,
    upload: 0,
    select: 1,
    preview: 2,
    checkout: 3,
    done: 3,
  };
  return { labels, current: map[screen] };
}

export function FlowProgress({ screen }: { screen: Screen }) {
  const source = useDraft((d) => d.source);
  const t = useT();
  const { labels, current } = progressFor(source, screen, t.common.progress);
  return <ProgressSteps labels={labels} current={current} />;
}
