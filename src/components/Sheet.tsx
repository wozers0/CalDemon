import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './ui';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** nearly full-height sheet */
  tall?: boolean;
}

/** iOS-style bottom sheet with swipe-down-to-close on the header. */
export function Sheet({ open, onClose, title, children, footer, tall }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDrag(0);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
        setDrag(0);
      }, 240);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    setDrag(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (drag > 110) onClose();
    else setDrag(0);
    startY.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button aria-label="Close" className={cn('absolute inset-0 bg-black/60 backdrop-blur-[2px]', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex w-full max-w-[430px] flex-col rounded-t-[30px] border-t border-white/[0.08] bg-ink-850 shadow-2xl shadow-black',
          tall ? 'h-[calc(100dvh-max(env(safe-area-inset-top),16px)-10px)]' : 'max-h-[calc(100dvh-max(env(safe-area-inset-top),16px)-10px)]',
          closing ? 'animate-sheet-out' : drag ? '' : 'animate-sheet-in',
        )}
        style={{ transform: drag && !closing ? `translateY(${drag}px)` : undefined, ['--from' as string]: `${drag}px`, transition: drag ? 'none' : undefined }}
      >
        <div className="shrink-0 touch-none px-5 pb-2 pt-2.5" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-white/20" />
          <div className="flex min-h-10 items-center justify-between gap-3">
            <div className="min-w-0 text-[20px] font-bold tracking-tight">{title}</div>
            <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-white/70 active:bg-white/15">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div className="scroll-area min-h-0 flex-1 px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe shrink-0 border-t border-white/[0.06] bg-ink-850 px-5 pt-3">{footer}</div>}
        {!footer && <div className="pb-safe shrink-0" />}
      </div>
    </div>,
    document.body,
  );
}
