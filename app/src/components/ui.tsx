import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { LANG_NAMES, LANGS, type Lang } from '@printagram/shared';
import { useLang, useT } from '@/i18n';
import s from './ui.module.css';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Button ---------- */

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'danger-ghost'
  | 'dark'
  | 'dark-outline';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'chip';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  to?: string;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  className,
  to,
  children,
  ...rest
}: ButtonProps) {
  const cls = cx(
    s.btn,
    s[`btn--${variant}`],
    s[`btn--${size}`],
    block && s['btn--block'],
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export interface CardProps {
  children: ReactNode;
  bordered?: boolean;
  radius?: 'lg' | 'xl' | '2xl';
  pad?: 'tight' | 'mid' | 'wide' | 'hero' | 'default';
  center?: boolean;
  primary?: boolean;
  muted?: boolean;
  className?: string;
  style?: CSSProperties;
  gap?: number;
}

export function Card({
  children,
  bordered,
  radius = 'lg',
  pad = 'default',
  center,
  primary,
  muted,
  className,
  style,
  gap,
}: CardProps) {
  return (
    <div
      className={cx(
        s.card,
        bordered && s['card--bordered'],
        radius === 'xl' && s['card--xl'],
        radius === '2xl' && s['card--2xl'],
        pad !== 'default' && s[`card--${pad}`],
        center && s['card--center'],
        primary && s['card--primary'],
        muted && s['card--muted'],
        'stack',
        className,
      )}
      style={{ gap: gap ?? 14, ...style }}
    >
      {children}
    </div>
  );
}

/* ---------- Pill ---------- */

export function Pill({
  children,
  tone = 'primary',
  className,
}: {
  children: ReactNode;
  tone?: 'primary' | 'muted' | 'tag';
  className?: string;
}) {
  return <span className={cx(s.pill, s[`pill--${tone}`], className)}>{children}</span>;
}

/* ---------- Segmented ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.seg} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={cx(s.seg__btn, o.value === value && s['seg__btn--on'])}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Chip ---------- */

export function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx(s.chip, on && s['chip--on'])}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ---------- Progress steps ---------- */

export function ProgressSteps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className={s.steps} aria-label={`Step ${current + 1} of ${labels.length}`}>
      {labels.map((label, i) => (
        <div key={label} className={s.step}>
          <div className={cx(s.step__bar, i <= current && s['step__bar--on'])} />
          <div className={cx(s.step__label, i === current && s['step__label--current'])}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Toggle ---------- */

export function ToggleRow({
  on,
  title,
  hint,
  onToggle,
  disabled,
}: {
  on: boolean;
  title: string;
  hint: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={s.toggleRow}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      disabled={disabled}
    >
      <div>
        <div className="medium">{title}</div>
        <div className="tiny muted">{hint}</div>
      </div>
      <div className={cx(s.toggle, on && s['toggle--on'])}>
        <div className={s.toggle__knob} />
      </div>
    </button>
  );
}

/* ---------- Inputs ---------- */

export function Input({
  className,
  bg,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { bg?: boolean }) {
  return <input className={cx(s.input, bg && s['input--bg'], className)} {...rest} />;
}

export function Fieldset({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.fieldset, className)}>{children}</div>;
}

export function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={s.fieldset__input} {...props} />;
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={s.fieldset__row}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className={s.label}>{children}</label>;
}

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      className={s.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- Language picker ---------- */

/** English / Svenska. Each name is written in its own language so it is findable either way. */
export function LanguageSelect() {
  const t = useT();
  const lang = useLang((l) => l.lang);
  const setLang = useLang((l) => l.setLang);
  return (
    <Select
      value={lang}
      onChange={(v) => setLang(v as Lang)}
      options={LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))}
      ariaLabel={t.common.language}
    />
  );
}

/* ---------- Banner ---------- */

export function Banner({
  tone,
  title,
  children,
  tight,
  className,
}: {
  tone: 'info' | 'warn' | 'error' | 'soft';
  title?: string;
  children?: ReactNode;
  tight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(s.banner, s[`banner--${tone}`], tight && s['banner--tight'], className)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {title && <div className={s.banner__title}>{title}</div>}
      {children}
    </div>
  );
}

/* ---------- Spinner / bar ---------- */

export function Spinner({ variant }: { variant?: 'slow' | 'inline' }) {
  return <div className={cx(s.spinner, variant && s[`spinner--${variant}`])} aria-hidden="true" />;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      className={s.bar}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={s.bar__fill} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/* ---------- Placeholder ---------- */

export function Placeholder({
  soft,
  style,
  className,
  children,
}: {
  soft?: boolean;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx(soft ? s['ph--soft'] : s.ph, className)} style={style}>
      {children}
    </div>
  );
}

/* ---------- Screen header ---------- */

export function ScreenHeader({
  title,
  onBack,
  wide,
  children,
  right,
}: {
  title: string;
  onBack?: () => void;
  wide?: boolean;
  children?: ReactNode;
  right?: ReactNode;
}) {
  const t = useT();
  return (
    <header className={cx(s.header, wide && s['header--wide'])}>
      <div className="row between gap-12">
        <div className="row gap-12">
          {onBack && (
            <button type="button" className="back" onClick={onBack} aria-label={t.common.back}>
              ←
            </button>
          )}
          <div className={s.header__title}>{title}</div>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

/* ---------- Wizard bar ---------- */

/** Bottom bar of every wizard step: Back on the left, an optional summary, the next step on the right. */
export function WizardBar({
  onBack,
  children,
  action,
}: {
  onBack: () => void;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="footer-bar">
      <div className="footer-bar__inner">
        <Button variant="outline" className="footer-bar__back" onClick={onBack}>
          {t.common.backArrow}
        </Button>
        <div className="footer-bar__summary">{children}</div>
        {action}
      </div>
    </div>
  );
}

/* ---------- Step card ---------- */

export function StepCard({
  n,
  title,
  text,
  shot,
  shotAspect = '9 / 16',
}: {
  n?: number;
  title: string;
  text: ReactNode;
  /** A drawing (GuideScreen) or, while none exists, a placeholder label. */
  shot: ReactNode;
  shotAspect?: string;
}) {
  return (
    <div className={cx(s.stepCard, n === undefined && s['stepCard--noNum'])}>
      {n !== undefined && <div className="num">{n}</div>}
      <div className="stack stack-4">
        <div className="semibold">{title}</div>
        <div className="small muted pretty">{text}</div>
      </div>
      <div
        className={cx(s.shot, typeof shot !== 'string' && s['shot--art'])}
        style={{ aspectRatio: shotAspect }}
      >
        {shot}
      </div>
    </div>
  );
}

/* ---------- Bullet ---------- */

export function Bullet({ warn, children }: { warn?: boolean; children: ReactNode }) {
  return (
    <div className="bullet">
      <span className={cx('check', warn && 'check--warn')}>{warn ? '!' : '✓'}</span>
      <span>{children}</span>
    </div>
  );
}

export { s as uiStyles };
