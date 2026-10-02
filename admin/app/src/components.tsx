import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { dayOffset, defaultRange, type Range } from './format';

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children ? <div className="toolbar">{children}</div> : null}
    </div>
  );
}

export function ErrorMsg({ error }: { error: string | null | undefined }) {
  return error ? (
    <div className="msg error" role="alert">
      {error}
    </div>
  ) : null;
}

export function Loading({ show }: { show: boolean }) {
  return show ? <p className="muted">Loading…</p> : null;
}

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

const PRESETS: [string, number][] = [
  ['7 d', 7],
  ['30 d', 30],
  ['90 d', 90],
  ['12 mo', 365],
];

/** Preset ranges plus a custom from/to, in one row above the charts. */
export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const today = dayOffset(0);
  return (
    <>
      <div className="seg" role="group" aria-label="Date range">
        {PRESETS.map(([label, n]) => {
          const r = defaultRange(n);
          const on = value.to === today && value.from === r.from;
          return (
            <button
              key={label}
              type="button"
              className={on ? 'on' : ''}
              onClick={() => onChange(r)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <input
        type="date"
        aria-label="From"
        value={value.from}
        max={value.to}
        onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
      />
      <input
        type="date"
        aria-label="To"
        value={value.to}
        min={value.from}
        onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
      />
    </>
  );
}

/** Axis top with four equal, whole-number steps (counts and cents are integers). */
function niceMax(v: number): number {
  const raw = Math.max(1, v / 4);
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const step = m * p;
    if (step >= raw && Number.isInteger(step)) return step * 4;
  }
  return 40 * p;
}

export interface Point {
  key: string;
  value: number;
}

/**
 * Single-series column chart (one hue, so no legend: the card title names it). Thin bars with
 * 4px rounded tops on one baseline, hairline grid, per-bar hover tooltip, and a table view.
 */
export function ColumnChart({
  data,
  format,
  label,
  height = 180,
}: {
  data: Point[];
  format: (v: number) => string;
  label: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  // Draw at the container's real width so axis text stays at its CSS size.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([e]) => e && setW(Math.max(240, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 44, r: 8, t: 10, b: 22 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = data.length ? plotW / data.length : plotW;
  const barW = Math.max(1, Math.min(24, slot - 2));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`}>
          <title id={`${id}-t`}>{label}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line
                className={t === 0 ? 'baseline' : 'grid-line'}
                x1={pad.l}
                x2={W - pad.r}
                y1={y(t)}
                y2={y(t)}
              />
              <text className="tick" x={pad.l - 6} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + slot * i + slot / 2;
            const top = y(d.value);
            const bh = pad.t + plotH - top;
            const r = Math.min(4, bh, barW / 2);
            const x0 = cx - barW / 2;
            const x1 = cx + barW / 2;
            const base = pad.t + plotH;
            const path =
              bh <= 0
                ? ''
                : `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${base} Z`;
            return (
              <g key={d.key}>
                {path ? <path className={`bar${hover === i ? ' hover' : ''}`} d={path} /> : null}
                <rect
                  className="hit"
                  x={pad.l + slot * i}
                  y={pad.t}
                  width={slot}
                  height={plotH}
                  onMouseEnter={() => setHover(i)}
                />
                {i % labelEvery === 0 ? (
                  <text className="tick" x={cx} y={H - 6} textAnchor="middle">
                    {d.key.length === 10 ? d.key.slice(5) : d.key}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        {h && hover !== null ? (
          <div
            className="tooltip"
            style={{
              left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%`,
              top: `${(y(h.value) / H) * 100}%`,
            }}
          >
            {h.key} · <b>{format(h.value)}</b>
          </div>
        ) : null}
      </div>
      <details className="table-view">
        <summary>Show as table</summary>
        <div className="table-wrap">
          <table>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{d.key}</td>
                  <td className="num">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Ranked list with a thin magnitude bar per row (top pages, referrers, devices). */
export function BarList({
  rows,
  empty = 'Nothing yet.',
}: {
  rows: { key: string; views: number; visitors: number }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.views));
  return (
    <div className="barlist">
      {rows.map((r) => (
        <div className="row" key={r.key} title={`${r.views} views · ${r.visitors} visitors`}>
          <span className="name">{r.key}</span>
          <span className="val">
            {r.views} <span className="muted">/ {r.visitors}</span>
          </span>
          <div className="track">
            <div className="fill" style={{ width: `${(r.views / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pager({
  total,
  offset,
  limit,
  onChange,
}: {
  total: number;
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return <div className="pager muted">{total} rows</div>;
  return (
    <div className="pager">
      <span className="muted">
        {offset + 1}–{Math.min(total, offset + limit)} of {total}
      </span>
      <button
        className="btn"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Previous
      </button>
      <button
        className="btn"
        disabled={offset + limit >= total}
        onClick={() => onChange(offset + limit)}
      >
        Next
      </button>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  ready: 'ok',
  paid: 'ok',
  failed: 'bad',
  refunded: 'bad',
  expired: '',
  created: 'info',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? ''}`}>{status}</span>;
}
