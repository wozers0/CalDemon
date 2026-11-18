import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNav } from '../state/nav';
import { useRestTimer } from '../state/timer';
import { cn } from './ui';

/** Pushed screen with an iOS navigation bar. Edge-swipe back is handled by the page host. */
export function Page({ title, right, children, footer, backLabel = 'Back', onBack, className }: {
  title?: ReactNode; right?: ReactNode; children: ReactNode; footer?: ReactNode; backLabel?: string; onBack?: () => void; className?: string;
}) {
  const { pop } = useNav();
  const { timer } = useRestTimer();
  return (
    <div className="flex h-full flex-col bg-ink-900">
      <header className="pt-safe relative z-10 shrink-0 border-b border-white/[0.05] bg-ink-900/85 backdrop-blur-xl">
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2">
          <button type="button" onClick={onBack ?? (() => pop())} className="flex items-center gap-0.5 justify-self-start rounded-lg py-1 pr-2 text-[17px] text-violet-300 active:opacity-50">
            <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
            <span className="max-w-[90px] truncate">{backLabel}</span>
          </button>
          <div className="max-w-[200px] truncate text-center text-[17px] font-semibold">{title}</div>
          <div className="flex items-center gap-1 justify-self-end pr-1">{right}</div>
        </div>
      </header>
      <div className={cn('scroll-area min-h-0 flex-1 px-5 pt-4', timer ? 'pb-28' : 'pb-8', className)}>{children}</div>
      {footer && <div className="pb-safe shrink-0 border-t border-white/[0.06] bg-ink-900/90 px-5 pt-3 backdrop-blur-xl">{footer}</div>}
    </div>
  );
}
