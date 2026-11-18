import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chime } from '../lib/media';
import { useFeedback } from './feedback';
import { useSettings } from './hooks';

interface TimerState {
  endsAt: number;
  total: number;
  label: string;
}

interface TimerValue {
  timer: TimerState | null;
  remaining: number;
  start: (seconds: number, label: string) => void;
  adjust: (seconds: number) => void;
  stop: () => void;
}

const Ctx = createContext<TimerValue | null>(null);
const KEY = 'cd-rest-timer';

function load(): TimerState | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerState | null;
    return t && t.endsAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}

function save(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(load);
  const [now, setNow] = useState(Date.now());
  const settings = useSettings();
  const { toast } = useFeedback();
  const soundRef = useRef(true);
  soundRef.current = settings?.sound ?? true;

  useEffect(() => {
    if (!timer) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= timer.endsAt) {
        setTimer(null);
        save(null);
        if (soundRef.current) chime();
        toast({ title: 'Rest complete', description: `Time for your next set${timer.label ? ` of ${timer.label}` : ''}.`, kind: 'info' });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer, toast]);

  const start = useCallback((seconds: number, label: string) => {
    const t = { endsAt: Date.now() + seconds * 1000, total: seconds, label };
    setTimer(t);
    save(t);
  }, []);

  const adjust = useCallback((seconds: number) => {
    setTimer((cur) => {
      if (!cur) return cur;
      const endsAt = Math.max(Date.now() + 1000, cur.endsAt + seconds * 1000);
      const t = { ...cur, endsAt, total: Math.max(1, cur.total + seconds) };
      save(t);
      return t;
    });
  }, []);

  const stop = useCallback(() => {
    setTimer(null);
    save(null);
  }, []);

  const remaining = timer ? Math.max(0, (timer.endsAt - now) / 1000) : 0;
  const value = useMemo(() => ({ timer, remaining, start, adjust, stop }), [timer, remaining, start, adjust, stop]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRestTimer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRestTimer outside RestTimerProvider');
  return v;
}
