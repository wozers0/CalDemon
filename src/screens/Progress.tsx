import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Check, Dumbbell, Flag, Flame, Plus, Trash2, Trophy } from 'lucide-react';
import { db } from '../db';
import { BarChart, LineChart } from '../components/Charts';
import { BadgeMedal } from '../components/BadgeIcon';
import { Page } from '../components/Page';
import { Button, Card, EmptyState, ListGroup, ListRow, ProgressBar, Ring, ScreenHeader, SectionTitle, Segmented, Skeleton, TextInput, cn } from '../components/ui';
import { BADGES } from '../data/badges';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useExercises, useSettings, useToday } from '../state/hooks';
import { activeDays, currentStreak, levelInfo, loadSnapshot, longestStreak, personalRecords, sessionStats, xpTotal, type Snapshot } from '../lib/stats';
import { addDays, convertWeight, dateKey, fmtDay, fmtDuration, fmtNum, lastNDays, uid, weekStart, weekdayShort } from '../lib/util';

type View = 'overview' | 'training' | 'habits';

export function ProgressScreen() {
  const snap = useLiveQuery(loadSnapshot);
  const [view, setView] = useState<View>('overview');
  return (
    <div className="pb-6">
      <ScreenHeader title="Progress" />
      <div className="px-5">
        <Segmented options={[{ value: 'overview', label: 'Overview' }, { value: 'training', label: 'Training' }, { value: 'habits', label: 'Habits' }]} value={view} onChange={setView} className="mb-4" />
        {!snap ? (
          <div className="space-y-3"><Skeleton className="h-36" /><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
        ) : (
          <div key={view} className="animate-tab">
            {view === 'overview' && <Overview snap={snap} />}
            {view === 'training' && <Training snap={snap} />}
            {view === 'habits' && <Habits snap={snap} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Overview({ snap }: { snap: Snapshot }) {
  const { push } = useNav();
  const today = useToday();
  const xp = xpTotal(snap);
  const lvl = levelInfo(xp);
  const days = activeDays(snap);
  const streak = currentStreak(days);
  const minutes = lastNDays(7, today).map((d) => ({
    label: weekdayShort(d).slice(0, 3),
    value: snap.sessions.filter((s) => dateKey(s.startedAt) === d).reduce((a, s) => a + sessionStats(s).duration / 60000, 0),
    highlight: d === today,
  }));
  const recent = [...snap.badges].sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 3);

  return (
    <>
      <Card className="p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <Ring value={lvl.progress} size={96} stroke={9}>
            <div><p className="text-[11px] text-white/45">Level</p><p className="text-[30px] font-bold leading-none">{lvl.level}</p></div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-white/45">Current rank</p>
            <p className="text-[24px] font-bold tracking-tight text-violet-200">{lvl.title}</p>
            <p className="tabular text-[13px] text-white/50">{fmtNum(xp)} XP • {fmtNum(lvl.toNext)} to next level</p>
            <ProgressBar value={lvl.progress} className="mt-2" />
          </div>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile icon={Dumbbell} color="#a78bfa" value={snap.sessions.length} label="Workouts" />
        <Tile icon={Flame} color="#fb923c" value={`${streak}`} label="Day streak" />
        <Tile icon={Award} color="#fbbf24" value={`${snap.badges.length}`} label="Badges" />
      </div>

      <Card className="mt-3 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">Training minutes</p>
          <p className="text-[13px] text-white/45">Last 7 days</p>
        </div>
        <LineChart data={minutes} format={(v) => `${fmtNum(v)} min`} />
      </Card>

      <SectionTitle title="Recent badges" action="See all" onAction={() => push({ name: 'badges' })} />
      {recent.length === 0 ? (
        <EmptyState icon={Trophy} title="Your first badge awaits" text="Complete a workout, log a meal or hit your water goal to start collecting." />
      ) : (
        <ListGroup>
          {recent.map((b) => {
            const def = BADGES.find((x) => x.id === b.id);
            if (!def) return null;
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <BadgeMedal badge={def} unlocked size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{def.title}</p>
                  <p className="truncate text-[13px] text-white/45">{def.description}</p>
                </div>
                <span className="text-[12px] text-white/35">{fmtDay(dateKey(b.unlockedAt))}</span>
              </div>
            );
          })}
        </ListGroup>
      )}

      <Milestones snap={snap} />
    </>
  );
}

function Milestones({ snap }: { snap: Snapshot }) {
  const { toast, confirm } = useFeedback();
  const [text, setText] = useState('');
  const list = [...snap.milestones].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
  const add = async () => {
    const title = text.trim();
    if (!title) return;
    await db.milestones.add({ id: uid(), title, done: false, createdAt: Date.now() });
    setText('');
    toast({ title: 'Milestone added', description: 'You’ve got this.' });
  };
  return (
    <>
      <SectionTitle title="Personal milestones" />
      <Card className="p-3">
        <div className="flex gap-2">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 10 push-ups in a row" onKeyDown={(e) => e.key === 'Enter' && add()} enterKeyHint="done" />
          <Button icon={Plus} onClick={add} disabled={!text.trim()} aria-label="Add milestone" className="shrink-0 px-4" />
        </div>
        {list.length === 0 ? (
          <p className="px-1 pb-1 pt-3 text-[13px] leading-snug text-white/40">Set goals that celebrate strength and wellbeing: a first pull-up, a 5 km walk, a week of good sleep.</p>
        ) : (
          <div className="mt-2 divide-y divide-white/[0.05]">
            {list.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button" aria-label={m.done ? 'Mark not done' : 'Mark done'} aria-pressed={m.done}
                  onClick={async () => {
                    await db.milestones.update(m.id, { done: !m.done, doneAt: m.done ? undefined : Date.now() });
                    if (!m.done) toast({ title: 'Milestone reached! 🎉', description: m.title });
                  }}
                  className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition', m.done ? 'border-emerald-400 bg-emerald-400 text-ink-900' : 'border-white/25')}
                >
                  {m.done && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
                <p className={cn('min-w-0 flex-1 text-[15px]', m.done && 'text-white/40 line-through')}>{m.title}</p>
                <button type="button" aria-label="Delete milestone" onClick={async () => { if (await confirm({ title: 'Delete milestone?', confirmText: 'Delete', danger: true })) await db.milestones.delete(m.id); }} className="grid h-8 w-8 place-items-center rounded-full text-white/30 active:bg-white/5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Training({ snap }: { snap: Snapshot }) {
  const { push } = useNav();
  const { map } = useExercises();
  const settings = useSettings();
  const unit = settings?.weightUnit ?? 'kg';
  const today = useToday();
  const weeks = useMemo(() => {
    const start = weekStart(today);
    return Array.from({ length: 8 }, (_, i) => addDays(start, (i - 7) * 7));
  }, [today]);
  const perWeek = weeks.map((w, i) => ({
    label: i === 7 ? 'Now' : `${Number(w.slice(8))}/${Number(w.slice(5, 7))}`,
    value: snap.sessions.filter((s) => { const k = dateKey(s.startedAt); return k >= w && k < addDays(w, 7); }).length,
    highlight: i === 7,
  }));
  const prs = [...personalRecords(snap.sessions, map).values()].sort((a, b) => b.at - a.at).slice(0, 12);
  const recent = [...snap.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 5);
  const totalVolume = snap.sessions.reduce((a, s) => a + sessionStats(s).volumeKg, 0);
  const totalTime = snap.sessions.reduce((a, s) => a + sessionStats(s).duration, 0);

  if (!snap.sessions.length) {
    return <EmptyState icon={Dumbbell} title="No training data yet" text="Finish your first workout to see weekly trends and personal records here." />;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={Dumbbell} color="#60a5fa" value={`${fmtNum(convertWeight(totalVolume, 'kg', unit))} ${unit}`} label="Total lifted" />
        <Tile icon={Flame} color="#f472b6" value={fmtDuration(totalTime)} label="Time training" />
      </div>
      <Card className="mt-3 p-4">
        <p className="text-[15px] font-semibold">Workouts per week</p>
        <p className="mb-1 text-[13px] text-white/45">Target: {settings?.weeklyTarget ?? 3} per week</p>
        <BarChart data={perWeek} />
      </Card>
      <SectionTitle title="Personal records" />
      {prs.length === 0 ? (
        <EmptyState icon={Trophy} title="No records yet" text="Complete sets to start tracking your bests." />
      ) : (
        <ListGroup>
          {prs.map((p) => (
            <ListRow
              key={p.exerciseId}
              icon={Trophy}
              iconColor="#fbbf24"
              title={map.get(p.exerciseId)?.name ?? 'Exercise'}
              subtitle={fmtDay(dateKey(p.at))}
              value={p.kind === 'weight' ? `${fmtNum(convertWeight(p.value, 'kg', unit), 1)} ${unit} × ${p.reps}` : p.kind === 'time' ? `${p.value}s` : `${p.value} reps`}
            />
          ))}
        </ListGroup>
      )}
      <SectionTitle title="Recent workouts" action="History" onAction={() => push({ name: 'history' })} />
      <ListGroup>
        {recent.map((s) => (
          <ListRow key={s.id} icon={Dumbbell} title={s.name} subtitle={`${fmtDay(dateKey(s.startedAt))} • ${fmtDuration(sessionStats(s).duration)}`} onClick={() => push({ name: 'sessionDetail', id: s.id })} />
        ))}
      </ListGroup>
    </>
  );
}

function Habits({ snap }: { snap: Snapshot }) {
  const today = useToday();
  const days = activeDays(snap);
  const trained = new Set(snap.sessions.map((s) => dateKey(s.startedAt)));
  const start = addDays(weekStart(today), -28);
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  const last30 = lastNDays(30, today);
  const waterDays = last30.filter((d) => (snap.water.find((w) => w.date === d)?.ml ?? 0) >= snap.settings.waterGoal).length;
  const mealDays = last30.filter((d) => snap.meals.some((m) => m.date === d)).length;
  const restDays = snap.checkins.filter((c) => c.restDay && last30.includes(c.date)).length;
  const energy = lastNDays(14, today)
    .map((d) => ({ d, c: snap.checkins.find((c) => c.date === d) }))
    .filter((x) => x.c)
    .map((x) => ({ label: weekdayShort(x.d).slice(0, 2), value: x.c!.energy, highlight: x.d === today }));

  return (
    <>
      <Card className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">Show-up calendar</p>
          <p className="text-[13px] text-white/45">Best streak: {longestStreak(days)} days</p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <p key={i} className="text-center text-[11px] text-white/35">{d}</p>)}
          {cells.map((k) => (
            <div
              key={k}
              title={k}
              className={cn('aspect-square rounded-lg', k > today ? 'bg-transparent' : trained.has(k) ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,.45)]' : days.has(k) ? 'bg-violet-500/35' : 'bg-white/[0.05]', k === today && 'ring-2 ring-white/70')}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[12px] text-white/45">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-500" />Workout</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-500/35" />Logged / rest</span>
        </div>
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile icon={Flag} color="#38bdf8" value={`${waterDays}`} label="Water goal days" />
        <Tile icon={Flag} color="#4ade80" value={`${mealDays}`} label="Days fuelled" />
        <Tile icon={Flag} color="#2dd4bf" value={`${restDays}`} label="Rest days" />
      </div>
      <p className="mt-2 px-1 text-[12px] text-white/35">Last 30 days. Rest days are part of training.</p>
      <Card className="mt-3 p-4">
        <p className="text-[15px] font-semibold">Energy check-ins</p>
        <p className="mb-1 text-[13px] text-white/45">1 = drained, 5 = great</p>
        {energy.length >= 2 ? <LineChart data={energy} color="#4ade80" format={(v) => `${v}/5`} /> : <p className="py-6 text-center text-[14px] text-white/40">Check in on Home for a few days to see your energy trend.</p>}
      </Card>
    </>
  );
}

function Tile({ icon: Icon, color, value, label }: { icon: typeof Dumbbell; color: string; value: string | number; label: string }) {
  return (
    <Card className="p-3.5">
      <Icon className="h-5 w-5" style={{ color }} />
      <p className="tabular mt-2 truncate text-[20px] font-bold leading-tight">{value}</p>
      <p className="truncate text-[12px] text-white/45">{label}</p>
    </Card>
  );
}

export function BadgesPage() {
  const unlocked = useLiveQuery(() => db.badges.toArray());
  const got = new Map((unlocked ?? []).map((b) => [b.id, b.unlockedAt]));
  return (
    <Page title="Badges">
      <p className="mb-4 text-center text-[15px] text-white/55">{got.size} of {BADGES.length} unlocked</p>
      <ProgressBar value={got.size / BADGES.length} className="mb-5" />
      <div className="grid grid-cols-3 gap-3">
        {BADGES.map((b, i) => {
          const at = got.get(b.id);
          return (
            <div key={b.id} className="animate-rise flex flex-col items-center rounded-3xl bg-ink-800 px-2 py-4 text-center" style={{ animationDelay: `${i * 25}ms` }}>
              <BadgeMedal badge={b} unlocked={!!at} />
              <p className={cn('mt-2 text-[13px] font-semibold leading-tight', !at && 'text-white/50')}>{b.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-white/40">{b.description}</p>
              {at && <p className="mt-1.5 text-[10px] font-semibold text-violet-300">{fmtDay(dateKey(at))}</p>}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
