import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BookFormat, PageSpec, Photo } from '@printagram/shared';
import { templateLabel } from '@printagram/shared';
import { Button } from '@/components/ui';
import { useLang, useT } from '@/i18n';
import { movePage, normalizePages } from './pageEdits';
import s from './arrange.module.css';

const containerId = (i: number) => `page-${i}`;

/**
 * "Arrange pages": every page as a card. Photos can be dragged within a page and between pages
 * (mouse, touch or keyboard: focus a photo, press Space, move with the arrow keys, Space again).
 * Pages move with the arrow buttons. Pages that get too full overflow onto the next page.
 */
export function Arrange({
  content,
  photosById,
  format,
  fullBleed,
  onChange,
  onOpenPage,
}: {
  content: PageSpec[];
  photosById: Map<string, Photo>;
  format: BookFormat;
  fullBleed: boolean;
  onChange: (pages: PageSpec[]) => void;
  onOpenPage: (contentIndex: number) => void;
}) {
  const t = useT();
  // Local copy while dragging; committed (normalised) on drop.
  const [draft, setDraft] = useState<PageSpec[] | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const pages = draft ?? content;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findPage = (id: UniqueIdentifier, list: PageSpec[]): number => {
    const sid = String(id);
    if (sid.startsWith('page-')) return Number(sid.slice(5));
    return list.findIndex((p) => p.photoIds.includes(sid));
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id);
    setDraft(content.map((p) => ({ ...p, photoIds: [...p.photoIds] })));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !draft) return;
    const from = findPage(active.id, draft);
    const to = findPage(over.id, draft);
    if (from < 0 || to < 0 || from === to || draft[to]!.template === 'text') return;
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.map((p) => ({ ...p, photoIds: [...p.photoIds] }));
      const id = String(active.id);
      next[from]!.photoIds = next[from]!.photoIds.filter((x) => x !== id);
      const target = next[to]!.photoIds;
      const overIdx = target.indexOf(String(over.id));
      target.splice(overIdx >= 0 ? overIdx : target.length, 0, id);
      return next;
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    let next = draft ?? content;
    if (over) {
      const pageIdx = findPage(active.id, next);
      const overIdx = next[pageIdx]?.photoIds.indexOf(String(over.id)) ?? -1;
      const curIdx = next[pageIdx]?.photoIds.indexOf(String(active.id)) ?? -1;
      if (pageIdx >= 0 && overIdx >= 0 && curIdx >= 0 && overIdx !== curIdx) {
        next = next.map((p, i) =>
          i === pageIdx ? { ...p, photoIds: arrayMove(p.photoIds, curIdx, overIdx) } : p,
        );
      }
    }
    setActiveId(null);
    setDraft(null);
    const normalized = normalizePages(next, photosById, format, fullBleed);
    if (JSON.stringify(normalized) !== JSON.stringify(content)) onChange(normalized);
  };

  const active = activeId ? photosById.get(String(activeId)) : null;
  const announcements = useMemo(
    () => ({
      onDragStart: () => t.preview.arrange.pickedUp,
      onDragOver: ({ over }: { over: { id: UniqueIdentifier } | null }) =>
        over
          ? t.preview.arrange.overPage(findPage(over.id, pages) + 1)
          : t.preview.arrange.notOverPage,
      onDragEnd: ({ over }: { over: { id: UniqueIdentifier } | null }) =>
        over
          ? t.preview.arrange.droppedOn(findPage(over.id, pages) + 1)
          : t.preview.arrange.dropCancelled,
      onDragCancel: () => t.preview.arrange.dropCancelled,
    }),
    [pages, t],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDraft(null);
      }}
      accessibility={{ announcements }}
    >
      <p className="small muted pretty">{t.preview.arrange.help}</p>
      <div className={s.grid}>
        {pages.map((pg, i) => (
          <PageCard
            key={i}
            index={i}
            page={pg}
            count={pages.length}
            photosById={photosById}
            onMove={(to) => onChange(movePage(content, i, to))}
            onOpen={() => onOpenPage(i)}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <img src={active.thumbUrl} alt="" className={s.overlay} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function PageCard({
  index,
  page,
  count,
  photosById,
  onMove,
  onOpen,
}: {
  index: number;
  page: PageSpec;
  count: number;
  photosById: Map<string, Photo>;
  onMove: (to: number) => void;
  onOpen: () => void;
}) {
  const t = useT();
  const lang = useLang((x) => x.lang);
  const { setNodeRef, isOver } = useDroppable({
    id: containerId(index),
    disabled: page.template === 'text',
  });
  return (
    <section
      className={`${s.card} ${isOver ? s['card--over'] : ''}`}
      aria-label={t.preview.arrange.page(index + 1)}
    >
      <div className={s.cardHead}>
        <button type="button" className="link-button" onClick={onOpen}>
          {t.preview.arrange.page(index + 1)}
        </button>
        <span className="micro muted">{templateLabel(page.template, lang)}</span>
        <span className={s.moveBtns}>
          <Button
            size="xs"
            variant="secondary"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={t.preview.arrange.movePageEarlier(index + 1)}
          >
            ↑
          </Button>
          <Button
            size="xs"
            variant="secondary"
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
            aria-label={t.preview.arrange.movePageLater(index + 1)}
          >
            ↓
          </Button>
        </span>
      </div>
      {page.template === 'text' ? (
        <div className={s.textPage}>{page.text || t.preview.arrange.textPage}</div>
      ) : (
        <SortableContext
          id={containerId(index)}
          items={page.photoIds}
          strategy={rectSortingStrategy}
        >
          <div ref={setNodeRef} className={s.photos}>
            {page.photoIds.map((id) => (
              <SortablePhoto key={id} id={id} photo={photosById.get(id)} />
            ))}
          </div>
        </SortableContext>
      )}
    </section>
  );
}

function SortablePhoto({ id, photo }: { id: string; photo: Photo | undefined }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className={s.photo}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      aria-label={t.preview.arrange.photo(
        photo?.caption ? photo.caption.slice(0, 40) : '',
        photo?.takenAt.slice(0, 10) ?? '',
      )}
      {...attributes}
      {...listeners}
    >
      {photo?.thumbUrl && <img src={photo.thumbUrl} alt="" draggable={false} />}
    </button>
  );
}
