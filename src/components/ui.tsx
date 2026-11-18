import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { ChevronRight, Loader2, Minus, Plus, type LucideIcon } from 'lucide-react';

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ className, children, onClick, style, label }: { className?: string; children: ReactNode; onClick?: () => void; style?: React.CSSProperties; label?: string }) {
  const base = 'relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-ink-800/90';
  if (onClick)
    return (
      <button type="button" aria-label={label} onClick={onClick} style={style} className={cn(base, 'block w-full text-left transition duration-150 active:scale-[0.985] active:bg-ink-750', className)}>
        {children}
      </button>
    );
  return (
    <div style={style} className={cn(base, className)}>
      {children}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-linear-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-950/50 active:brightness-90',
  secondary: 'bg-white/[0.08] text-white active:bg-white/[0.14]',
  ghost: 'bg-transparent text-violet-300 active:bg-white/[0.06]',
  danger: 'bg-rose-500/15 text-rose-300 active:bg-rose-500/25',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  full?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, full, className, children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: 'h-9 px-3.5 text-[14px] rounded-xl gap-1.5', md: 'h-12 px-5 text-[16px] rounded-2xl gap-2', lg: 'h-14 px-6 text-[17px] rounded-[18px] gap-2' };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
        sizes[size], VARIANTS[variant], full && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : Icon && <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, onClick, className, tone = 'default', disabled }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string; tone?: 'default' | 'accent' | 'plain'; disabled?: boolean }) {
  const tones = { default: 'bg-white/[0.07] text-white active:bg-white/[0.14]', accent: 'bg-violet-500/20 text-violet-200 active:bg-violet-500/30', plain: 'text-white/80 active:bg-white/[0.08]' };
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90 disabled:opacity-30', tones[tone], className)}>
      <Icon className="h-[20px] w-[20px]" strokeWidth={2} />
    </button>
  );
}

export function ScreenHeader({ title, eyebrow, right }: { title: ReactNode; eyebrow?: string; right?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 px-5 pb-3">
      <div className="min-w-0 pt-2">
        {eyebrow && <p className="text-[13px] font-medium uppercase tracking-wide text-white/45">{eyebrow}</p>}
        <h1 className="truncate text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2 pb-1">{right}</div>}
    </header>
  );
}

export function SectionTitle({ title, action, onAction, className }: { title: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn('mb-2.5 mt-6 flex items-center justify-between px-1', className)}>
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-[15px] font-medium text-violet-300 active:opacity-60">
          {action}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={cn('relative grid rounded-[14px] bg-white/[0.06] p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-[10px] bg-ink-600 shadow-md shadow-black/30 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ left: 4, width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('relative z-10 h-9 truncate rounded-[10px] px-2 text-[14px] font-semibold transition-colors', o.value === value ? 'text-white' : 'text-white/55')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange, className }: { options: readonly T[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5', className)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold transition active:scale-95',
            o === value ? 'bg-violet-500 text-white shadow-lg shadow-violet-900/40' : 'bg-white/[0.07] text-white/70',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Ring({ value, size = 160, stroke = 14, color = '#8b5cf6', track = 'rgba(255,255,255,0.07)', children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Ring split into coloured segments (e.g. macro energy share). */
export function SegmentRing({ segments, size = 160, stroke = 14, children }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  const gap = total ? Math.min(6, c * 0.02) : 0;
  let offset = 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = s.value > 0 && (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${Math.max(0.01, len - gap - stroke * 0.6)} ${c}`} strokeDashoffset={-offset - stroke * 0.3}
                style={{ transition: 'stroke-dasharray .8s ease, stroke-dashoffset .8s ease' }}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, color = 'linear-gradient(90deg,#7c3aed,#a78bfa)', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-white/[0.08]', className)}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => string; label?: string }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.07] p-1" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label ?? ''}`} onClick={() => set(value - step)} disabled={value <= min} className="grid h-8 w-8 place-items-center rounded-full active:bg-white/10 disabled:opacity-30">
        <Minus className="h-4 w-4" />
      </button>
      <span className="tabular min-w-[3.2rem] text-center text-[15px] font-semibold">{format ? format(value) : value}</span>
      <button type="button" aria-label={`Increase ${label ?? ''}`} onClick={() => set(value + step)} disabled={value >= max} className="grid h-8 w-8 place-items-center rounded-full active:bg-white/10 disabled:opacity-30">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-violet-500' : 'bg-white/[0.16]')}
    >
      <span className={cn('absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200', checked ? 'translate-x-[22px]' : 'translate-x-[2px]')} />
    </button>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-white/55">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-[12px] leading-snug text-white/40">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-2xl border border-white/[0.06] bg-white/[0.06] px-4 py-3 outline-none transition focus:border-violet-400/60 focus:bg-white/[0.08]';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...p} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(inputCls, 'resize-none leading-snug', className)} {...p} />;
});

export function EmptyState({ icon: Icon, title, text, action, className }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-[26px] border border-dashed border-white/[0.1] px-6 py-8 text-center', className)}>
      <div className="relative mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
        <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl" />
        <Icon className="relative h-7 w-7" strokeWidth={1.8} />
      </div>
      <p className="text-[17px] font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-[260px] text-[14px] leading-snug text-white/50">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
}

export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-white/[0.06] overflow-hidden rounded-[22px] border border-white/[0.06] bg-ink-800/90', className)}>{children}</div>;
}

export function ListRow({ icon: Icon, iconColor = '#a78bfa', title, subtitle, value, onClick, chevron = !!onClick, danger, right }: {
  icon?: LucideIcon; iconColor?: string; title: ReactNode; subtitle?: ReactNode; value?: ReactNode; onClick?: () => void; chevron?: boolean; danger?: boolean; right?: ReactNode;
}) {
  const content = (
    <>
      {Icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${iconColor}22`, color: iconColor }}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[16px] font-medium', danger && 'text-rose-400')}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[13px] text-white/45">{subtitle}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-[15px] text-white/50">{value}</span>}
      {right}
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition active:bg-white/[0.05]')}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function Pill({ children, color = '#a78bfa', className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', className)} style={{ background: `${color}22`, color }}>
      {children}
    </span>
  );
}

export function ScalePicker({ value, onChange, options, label }: { value: number; onChange: (v: number) => void; options: { emoji: string; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
      {options.map((o, i) => {
        const v = i + 1;
        const active = v === value;
        return (
          <button
            key={v} type="button" role="radio" aria-checked={active} onClick={() => onChange(v)}
            className={cn('flex flex-col items-center gap-1 rounded-2xl border py-2.5 transition active:scale-95', active ? 'border-violet-400/70 bg-violet-500/20' : 'border-white/[0.06] bg-white/[0.04]')}
          >
            <span className="text-[24px] leading-none">{o.emoji}</span>
            <span className={cn('text-[11px] font-medium', active ? 'text-white' : 'text-white/45')}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
