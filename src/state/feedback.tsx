import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, Trophy } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'badge';
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface FeedbackValue {
  toast: (t: { title: string; description?: string; kind?: ToastKind; duration?: number }) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackValue | null>(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info, badge: Trophy };
const COLORS = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-violet-300', badge: 'text-amber-300' };

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void; closing?: boolean }) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback<FeedbackValue['toast']>(({ title, description, kind = 'success', duration = 3200 }) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, title, description, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);

  const close = (v: boolean) => {
    if (!dialog) return;
    dialog.resolve(v);
    setDialog({ ...dialog, closing: true });
    setTimeout(() => setDialog(null), 200);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] mx-auto flex max-w-[430px] flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]">
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <div
                key={t.id}
                role="status"
                className="animate-toast pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1728]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
              >
                <Icon className={`h-5 w-5 shrink-0 ${COLORS[t.kind]}`} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-tight">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] leading-snug text-white/60">{t.description}</p>}
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
      {dialog &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center">
            <button
              aria-label="Cancel"
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${dialog.closing ? 'animate-fade-out' : 'animate-fade-in'}`}
              onClick={() => close(false)}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              className={`relative mx-auto w-full max-w-[430px] px-3 pb-[max(env(safe-area-inset-bottom),12px)] ${dialog.closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
            >
              <div className="overflow-hidden rounded-[22px] bg-[#1b1728] text-center">
                <div className="px-6 pb-4 pt-5">
                  <p className="text-[17px] font-semibold">{dialog.title}</p>
                  {dialog.message && <p className="mt-1.5 text-[14px] leading-snug text-white/60">{dialog.message}</p>}
                </div>
                <button
                  className={`w-full border-t border-white/10 py-4 text-[17px] font-semibold active:bg-white/5 ${dialog.danger ? 'text-rose-400' : 'text-violet-300'}`}
                  onClick={() => close(true)}
                >
                  {dialog.confirmText ?? 'Confirm'}
                </button>
              </div>
              <button className="mt-2 w-full rounded-[22px] bg-[#1b1728] py-4 text-[17px] font-semibold active:bg-white/5" onClick={() => close(false)}>
                {dialog.cancelText ?? 'Cancel'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback outside FeedbackProvider');
  return v;
}
