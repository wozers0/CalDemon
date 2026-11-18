import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Apple, ChartColumn, Dumbbell, Flame, House, Minus, Plus, Timer, X } from 'lucide-react';
import { db, saveSettings } from './db';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logo, Wordmark } from './components/Logo';
import { Sheet } from './components/Sheet';
import { Button, Field, Segmented, TextInput, cn } from './components/ui';
import { NavProvider, useNav, type Route, type StackEntry } from './state/nav';
import { FeedbackProvider, useFeedback } from './state/feedback';
import { RestTimerProvider, useRestTimer } from './state/timer';
import { useSettings } from './state/hooks';
import { loadSnapshot } from './lib/stats';
import { BADGES, earnedBadgeIds } from './data/badges';
import { fmtClock } from './lib/util';
import type { Tab } from './types';
import { HomeScreen } from './screens/Home';
import { WorkoutsScreen } from './screens/Workouts';
import { WorkoutDetailPage } from './screens/WorkoutDetail';
import { WorkoutEditorPage } from './screens/WorkoutEditor';
import { SessionPage } from './screens/Session';
import { SessionDetailPage } from './screens/SessionDetail';
import { HistoryPage, LibraryPage } from './screens/History';
import { NutritionScreen } from './screens/Nutrition';
import { BadgesPage, ProgressScreen } from './screens/Progress';
import { BreathePage, MotivationScreen } from './screens/Motivation';
import { SettingsPage } from './screens/Settings';

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'progress', label: 'Progress', icon: ChartColumn },
  { id: 'motivation', label: 'Motivation', icon: Flame },
];

export default function App() {
  return (
    <FeedbackProvider>
      <NavProvider>
        <RestTimerProvider>
          <Shell />
        </RestTimerProvider>
      </NavProvider>
    </FeedbackProvider>
  );
}

function Shell() {
  const settings = useSettings();
  const { tab, setTab, stack } = useNav();
  const scrollRef = useRef<HTMLDivElement>(null);
  const positions = useRef<Partial<Record<Tab, number>>>({});

  // restore each tab's scroll position when switching tabs
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = positions.current[tab] ?? 0;
  }, [tab]);

  if (!settings) return <Splash />;

  const switchTab = (t: Tab) => {
    if (scrollRef.current) positions.current[tab] = scrollRef.current.scrollTop;
    if (t === tab) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    else setTab(t);
  };

  return (
    <div className="relative mx-auto h-dvh max-w-[430px] overflow-clip bg-ink-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-full bg-violet-700/[0.13] blur-3xl" />
      </div>
      <div ref={scrollRef} className="scroll-area relative h-full pb-[calc(env(safe-area-inset-bottom)+84px)]">
        <ErrorBoundary inline key={tab}>
          <div className="animate-tab">
            {tab === 'home' && <HomeScreen />}
            {tab === 'workouts' && <WorkoutsScreen />}
            {tab === 'nutrition' && <NutritionScreen />}
            {tab === 'progress' && <ProgressScreen />}
            {tab === 'motivation' && <MotivationScreen />}
          </div>
        </ErrorBoundary>
      </div>
      <TabBar tab={tab} onChange={switchTab} />
      {stack.map((entry, i) => (
        <PageLayer key={entry.key} entry={entry} isTop={i === stack.length - 1} />
      ))}
      <RestTimerBar raised={!stack.some((e) => !e.leaving)} />
      <BadgeWatcher />
      <Onboarding open={!settings.onboarded} />
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink-900/80 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-2xl" aria-label="Main">
      <div className="grid grid-cols-5 px-1 pt-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === tab;
          return (
            <button key={id} type="button" onClick={() => onChange(id)} aria-current={active ? 'page' : undefined} className="group flex flex-col items-center gap-1 py-1 active:scale-90 transition">
              <span className="relative grid h-7 w-12 place-items-center">
                {active && <span className="absolute inset-0 rounded-full bg-violet-500/20 blur-[6px]" />}
                <Icon className={cn('relative h-[24px] w-[24px] transition-colors', active ? 'text-violet-300' : 'text-white/45')} strokeWidth={active ? 2.3 : 1.9} />
              </span>
              <span className={cn('text-[10.5px] font-medium transition-colors', active ? 'text-violet-200' : 'text-white/45')}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function renderRoute(r: Route) {
  switch (r.name) {
    case 'workout': return <WorkoutDetailPage id={r.id} />;
    case 'editor': return <WorkoutEditorPage id={r.id} copyOf={r.copyOf} />;
    case 'session': return <SessionPage id={r.id} />;
    case 'sessionDetail': return <SessionDetailPage id={r.id} fresh={r.fresh} />;
    case 'history': return <HistoryPage />;
    case 'library': return <LibraryPage />;
    case 'settings': return <SettingsPage />;
    case 'badges': return <BadgesPage />;
    case 'breathe': return <BreathePage />;
  }
}

/** A pushed page, with iOS-style edge swipe to go back. */
function PageLayer({ entry, isTop }: { entry: StackEntry; isTop: boolean }) {
  const { pop } = useNav();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!isTop || entry.leaving || t.clientX > 28) return;
    drag.current = { x: t.clientX, y: t.clientY, dx: 0, active: false };
  };
  const onMove = (e: TouchEvent) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x;
    if (!d.active) {
      if (Math.abs(t.clientY - d.y) > 12 && Math.abs(t.clientY - d.y) > dx) {
        drag.current = null;
        return;
      }
      if (dx > 8) d.active = true;
    }
    if (d.active) {
      d.dx = Math.max(0, dx);
      ref.current.style.transition = 'none';
      ref.current.style.transform = `translateX(${d.dx}px)`;
    }
  };
  const onEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active || !ref.current) return;
    if (d.dx > Math.min(120, window.innerWidth * 0.3)) {
      pop(d.dx);
    } else {
      ref.current.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      ref.current.style.transform = 'translateX(0)';
    }
  };

  return (
    <div
      ref={ref}
      className={cn('absolute inset-0 z-40 bg-ink-900 shadow-[-20px_0_40px_rgba(0,0,0,.45)]', entry.leaving ? 'animate-page-out pointer-events-none' : 'animate-page-in')}
      style={{ '--from': `${entry.from ?? 0}px` } as CSSProperties}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
    >
      <ErrorBoundary inline>{renderRoute(entry.route)}</ErrorBoundary>
    </div>
  );
}

function RestTimerBar({ raised }: { raised: boolean }) {
  const { timer, remaining, adjust, stop } = useRestTimer();
  if (!timer) return null;
  const pct = timer.total ? 1 - remaining / timer.total : 1;
  return (
    <div
      className="animate-toast absolute inset-x-3 z-50"
      style={{ bottom: raised ? 'calc(max(env(safe-area-inset-bottom), 8px) + 70px)' : 'calc(max(env(safe-area-inset-bottom), 12px) + 76px)' }}
      role="timer"
      aria-label="Rest timer"
    >
      <div className="relative overflow-hidden rounded-[22px] border border-violet-400/30 bg-[#1d1630]/95 p-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="absolute inset-y-0 left-0 bg-violet-500/15 transition-[width] duration-300" style={{ width: `${pct * 100}%` }} />
        <div className="relative flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/25 text-violet-200"><Timer className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200/70">Rest</p>
            <p className="tabular text-[22px] font-bold leading-none">{fmtClock(remaining)}</p>
          </div>
          <button type="button" aria-label="Subtract 15 seconds" onClick={() => adjust(-15)} className="flex h-10 items-center gap-0.5 rounded-full bg-white/[0.08] px-3 text-[13px] font-semibold active:bg-white/15"><Minus className="h-3.5 w-3.5" />15</button>
          <button type="button" aria-label="Add 15 seconds" onClick={() => adjust(15)} className="flex h-10 items-center gap-0.5 rounded-full bg-white/[0.08] px-3 text-[13px] font-semibold active:bg-white/15"><Plus className="h-3.5 w-3.5" />15</button>
          <button type="button" aria-label="Skip rest" onClick={stop} className="grid h-10 w-10 place-items-center rounded-full bg-violet-500 active:scale-90"><X className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  );
}

/** Watches data for newly earned badges and celebrates them. */
function BadgeWatcher() {
  const snap = useLiveQuery(loadSnapshot);
  const { toast } = useFeedback();
  const busy = useRef(false);
  useEffect(() => {
    if (!snap || busy.current) return;
    const have = new Set(snap.badges.map((b) => b.id));
    const fresh = earnedBadgeIds(snap).filter((id) => !have.has(id));
    if (!fresh.length) return;
    busy.current = true;
    const now = Date.now();
    db.badges
      .bulkPut(fresh.map((id) => ({ id, unlockedAt: now })))
      .then(() => {
        if (fresh.length <= 2) {
          fresh.forEach((id) => {
            const b = BADGES.find((x) => x.id === id);
            if (b) toast({ title: `Badge unlocked: ${b.title}`, description: b.description, kind: 'badge', duration: 4200 });
          });
        } else {
          toast({ title: `${fresh.length} badges unlocked!`, description: 'See them in Progress.', kind: 'badge', duration: 4200 });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
      });
  }, [snap, toast]);
  return null;
}

function Onboarding({ open }: { open: boolean }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [saving, setSaving] = useState(false);
  const finish = async () => {
    setSaving(true);
    try {
      await saveSettings({ name: name.trim(), weightUnit: unit, onboarded: true });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet open={open} onClose={finish} title=" " footer={<Button full size="lg" loading={saving} onClick={finish}>Let's go</Button>}>
      <div className="flex flex-col items-center text-center">
        <Logo size={84} glow />
        <h2 className="mt-3 text-[28px]"><Wordmark /></h2>
        <p className="mt-2 max-w-[300px] text-[15px] leading-snug text-white/60">
          Train strong, fuel well and recover properly. No restrictive goals, no guilt. Just progress you can feel.
        </p>
      </div>
      <div className="mt-6 space-y-4">
        <Field label="What should we call you?" hint="Leave blank and we'll call you Demon.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Demon" maxLength={24} />
        </Field>
        <Field label="Weight unit">
          <Segmented options={[{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lb', label: 'Pounds (lb)' }]} value={unit} onChange={setUnit} />
        </Field>
        <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] leading-snug text-white/50">
          Everything you log stays private on this iPhone. It works offline, too.
        </p>
      </div>
    </Sheet>
  );
}

function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-ink-900">
      <div className="animate-pulse"><Logo size={88} glow /></div>
      <p className="text-[22px]"><Wordmark /></p>
    </div>
  );
}
