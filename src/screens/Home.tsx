import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Beef, CheckCircle2, Droplet, Dumbbell, Flame, Heart, Play, Plus, Settings as Gear, Wheat } from 'lucide-react';
import { db } from '../db';
import { Card, IconButton, ProgressBar, SegmentRing, Skeleton } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useActiveSession, useDoneSessions, useExercises, useSettings, useTemplates, useToday } from '../state/hooks';
import { addWater, useStartWorkout } from '../lib/actions';
import { MACRO_COLORS, macroSplit, sumMeals } from '../lib/nutrition';
import { estimateMinutes, readiness, recommend, sessionStats } from '../lib/stats';
import { dailyIndex, QUOTES } from '../data/motivation';
import { addDays, dateKey, fmtDuration, fmtLitres, fmtLongDate, fmtNum, greeting, weekStart, weekdayShort } from '../lib/util';
import { CheckInSheet } from './CheckIn';

export function HomeScreen() {
  const settings = useSettings();
  const today = useToday();
  const { setTab, push } = useNav();
  const { toast } = useFeedback();
  const startWorkout = useStartWorkout();
  const meals = useLiveQuery(() => db.meals.where('date').equals(today).toArray(), [today]);
  const water = useLiveQuery(async () => (await db.water.get(today))?.ml ?? 0, [today]);
  const checkin = useLiveQuery(() => db.checkins.get(today), [today], undefined);
  const sessions = useDoneSessions();
  const active = useActiveSession();
  const { list: templates } = useTemplates();
  const { map: exMap } = useExercises();
  const [checkOpen, setCheckOpen] = useState(false);

  const totals = useMemo(() => sumMeals(meals ?? []), [meals]);
  const split = macroSplit(totals);
  const ready = readiness(checkin);
  const doneToday = sessions?.find((s) => dateKey(s.startedAt) === today);
  const suggestion = useMemo(() => recommend(templates, sessions ?? [], checkin)[0], [templates, sessions, checkin]);
  const week = useMemo(() => {
    const start = weekStart(today);
    const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const trained = new Set((sessions ?? []).map((s) => dateKey(s.startedAt)));
    return { keys, trained, count: keys.filter((k) => trained.has(k)).length };
  }, [sessions, today]);

  const quote = QUOTES[dailyIndex(QUOTES.length, today)];
  const name = settings?.name?.trim() || 'Demon';
  const waterGoal = settings?.waterGoal ?? 2500;

  const onWater = async () => {
    try {
      await addWater(today, settings?.waterStep ?? 250);
      const next = (water ?? 0) + (settings?.waterStep ?? 250);
      if ((water ?? 0) < waterGoal && next >= waterGoal) toast({ title: 'Water goal reached 💧', description: 'Nicely done. Stay hydrated!' });
    } catch {
      toast({ title: "Couldn't save water", kind: 'error' });
    }
  };

  const delay = (i: number) => ({ animationDelay: `${i * 55}ms` });

  return (
    <div className="px-5 pb-6">
      <header className="pt-safe flex items-start justify-between pb-4">
        <div className="animate-rise pt-2">
          <p className="text-[13px] font-medium uppercase tracking-wide text-white/45">{fmtLongDate()}</p>
          <h1 className="mt-0.5 text-[30px] font-bold leading-[1.1] tracking-tight">
            {greeting()},<br />
            <span className="bg-linear-to-r from-violet-300 to-violet-500 bg-clip-text text-transparent">{name}</span>.
          </h1>
        </div>
        <IconButton icon={Gear} label="Settings" onClick={() => push({ name: 'settings' })} className="mt-3" />
      </header>

      {active && (
        <Card onClick={() => push({ name: 'session', id: active.id })} className="animate-rise mb-3 border-violet-500/30 bg-violet-500/15 p-4" label="Resume workout">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-violet-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/50" />
              <Play className="relative h-5 w-5 fill-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-violet-200/80">Workout in progress</p>
              <p className="truncate text-[17px] font-semibold">{active.name}</p>
            </div>
            <span className="text-[15px] font-semibold text-violet-200">Resume</span>
          </div>
        </Card>
      )}

      {/* Readiness */}
      <Card onClick={() => setCheckOpen(true)} className="animate-rise mb-3 p-4" style={delay(1)} label="Daily check-in">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: READY_COLORS[ready.level] + '22', color: READY_COLORS[ready.level] }}>
            <Heart className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{ready.title}</p>
            <p className="text-[13px] leading-snug text-white/50">{checkin ? ready.text : "Tap for a quick check-in. It tailors today's plan."}</p>
          </div>
          <span className="text-[13px] font-semibold text-violet-300">{checkin ? 'Edit' : 'Check in'}</span>
        </div>
      </Card>

      {/* Fuel */}
      <Card onClick={() => setTab('nutrition')} className="animate-rise p-5" style={delay(2)} label="Open nutrition">
        {meals === undefined ? (
          <div className="flex items-center gap-5"><Skeleton className="h-32 w-32 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div></div>
        ) : (
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="animate-glow absolute inset-3 rounded-full bg-violet-600/25 blur-2xl" />
              <SegmentRing size={132} stroke={12} segments={[{ value: totals.protein * 4, color: MACRO_COLORS.protein }, { value: totals.carbs * 4, color: MACRO_COLORS.carbs }, { value: totals.fat * 9, color: MACRO_COLORS.fat }]}>
                <div>
                  <Flame className="mx-auto mb-0.5 h-4 w-4 text-violet-300" />
                  {settings?.showCalories !== false ? (
                    <>
                      <p className="tabular text-[26px] font-bold leading-none tracking-tight">{fmtNum(totals.kcal)}</p>
                      <p className="mt-1 text-[11px] text-white/45">kcal fuelled</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[26px] font-bold leading-none">{meals.length}</p>
                      <p className="mt-1 text-[11px] text-white/45">{meals.length === 1 ? 'meal' : 'meals'} logged</p>
                    </>
                  )}
                </div>
              </SegmentRing>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <Macro icon={Beef} label="Protein" grams={totals.protein} pct={split.protein} color={MACRO_COLORS.protein} />
              <Macro icon={Wheat} label="Carbs" grams={totals.carbs} pct={split.carbs} color={MACRO_COLORS.carbs} />
              <Macro icon={Droplet} label="Fat" grams={totals.fat} pct={split.fat} color={MACRO_COLORS.fat} />
            </div>
          </div>
        )}
        {meals && meals.length === 0 && (
          <p className="mt-4 flex items-center gap-1.5 text-[14px] text-white/50">
            <Plus className="h-4 w-4 text-violet-300" /> Log your first meal to see your balance
          </p>
        )}
      </Card>

      {/* Today's workout */}
      <div className="animate-rise mt-3" style={delay(3)}>
        {doneToday ? (
          <Card onClick={() => push({ name: 'sessionDetail', id: doneToday.id })} className="border-emerald-400/20 bg-emerald-400/[0.07] p-5" label="View today's workout">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-emerald-200/70">Workout complete</p>
                <p className="truncate text-[19px] font-bold">{doneToday.name}</p>
                <p className="text-[13px] text-white/50">{fmtDuration(sessionStats(doneToday).duration)} • {sessionStats(doneToday).sets} sets. Great work!</p>
              </div>
            </div>
          </Card>
        ) : suggestion ? (
          <Card onClick={() => push({ name: 'workout', id: suggestion.id })} className="p-5" label="Today's workout">
            <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-violet-600/25 blur-3xl" />
            <Dumbbell className="pointer-events-none absolute -bottom-5 right-4 h-28 w-28 -rotate-12 text-violet-400/[0.08]" strokeWidth={1.5} />
            <div className="relative flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-500/20 text-violet-300"><Dumbbell className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white/50">{ready.level === 'easy' || ready.level === 'rest' ? 'Suggested for recovery' : "Today's workout"}</p>
                <p className="truncate text-[21px] font-bold tracking-tight">{suggestion.name}</p>
                <p className="truncate text-[13px] text-white/50">{suggestion.subtitle} • ~{estimateMinutes(suggestion, exMap)} min</p>
              </div>
              <button
                type="button" aria-label={`Start ${suggestion.name}`}
                onClick={(e) => { e.stopPropagation(); void startWorkout(suggestion); }}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-500 shadow-lg shadow-violet-900/60 active:scale-90"
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </Card>
        ) : (
          <Skeleton className="h-[96px]" />
        )}
      </div>

      {/* Water + week */}
      <div className="animate-rise mt-3 grid grid-cols-2 gap-3" style={delay(4)}>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[13px] text-white/50"><Droplet className="h-4 w-4 text-sky-400" /> Water</p>
              <p className="tabular mt-1 text-[22px] font-bold leading-tight">{fmtLitres(water ?? 0).replace(' L', '')}<span className="text-[14px] font-medium text-white/45"> / {fmtLitres(waterGoal)}</span></p>
            </div>
            <button type="button" onClick={onWater} aria-label={`Add ${settings?.waterStep ?? 250} ml of water`} className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/15 text-sky-300 active:scale-90">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
          <ProgressBar className="mt-3" value={(water ?? 0) / waterGoal} color="linear-gradient(90deg,#0ea5e9,#7dd3fc)" />
        </Card>
        <Card className="p-4" onClick={() => setTab('progress')} label="This week">
          <p className="flex items-center gap-1.5 text-[13px] text-white/50"><Flame className="h-4 w-4 text-orange-400" /> This week</p>
          <p className="tabular mt-1 text-[22px] font-bold leading-tight">{week.count}<span className="text-[14px] font-medium text-white/45"> / {settings?.weeklyTarget ?? 3} workouts</span></p>
          <div className="mt-3 flex justify-between">
            {week.keys.map((k) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${week.trained.has(k) ? 'bg-violet-400 shadow-[0_0_8px_#8b5cf6]' : k === today ? 'border border-violet-400/70' : 'bg-white/10'}`} />
                <span className={`text-[9px] ${k === today ? 'font-bold text-white' : 'text-white/35'}`}>{weekdayShort(k).slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quote */}
      <Card onClick={() => setTab('motivation')} className="animate-rise mt-3 p-5" style={delay(5)} label="Open motivation">
        <Mountains />
        <div className="relative flex gap-3 pr-20">
          <span className="w-1 shrink-0 rounded-full bg-linear-to-b from-violet-400 to-violet-700" />
          <p className="text-[17px] font-semibold leading-snug">“{quote}”</p>
        </div>
      </Card>

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} date={today} existing={checkin} />
    </div>
  );
}

const READY_COLORS: Record<string, string> = { unknown: '#a78bfa', rest: '#2dd4bf', easy: '#fbbf24', go: '#4ade80', steady: '#a78bfa' };

function Macro({ icon: Icon, label, grams, pct, color }: { icon: typeof Beef; label: string; grams: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-1.5 text-white/60"><Icon className="h-3.5 w-3.5" style={{ color }} />{label}</span>
        <span className="tabular font-semibold">{fmtNum(grams)} g</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function Mountains({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none absolute bottom-0 right-0 h-full w-40 opacity-90 ${className}`} viewBox="0 0 160 100" preserveAspectRatio="xMaxYMax meet" aria-hidden>
      <defs>
        <radialGradient id="mglow" cx="0.7" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity=".55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="115" cy="32" r="60" fill="url(#mglow)" />
      <circle cx="118" cy="30" r="14" fill="#c4b5fd" opacity=".35" />
      <path d="M40 100 L85 48 L100 62 L118 38 L160 100 Z" fill="#1a1426" />
      <path d="M70 100 L118 38 L160 100 Z" fill="#231a36" />
      <path d="M116 38 l2 -7 l2 7 z" fill="#0b0a12" />
      <rect x="116.6" y="27" width="2.8" height="5" rx="1.4" fill="#0b0a12" />
    </svg>
  );
}
