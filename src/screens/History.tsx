import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Dumbbell, Plus, Trash2, Trophy } from 'lucide-react';
import { db } from '../db';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { Button, Card, Chips, EmptyState, IconButton, ListGroup, ListRow, Pill, Skeleton } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useDoneSessions, useExercises } from '../state/hooks';
import { lastPerformance, personalRecords, sessionStats } from '../lib/stats';
import { convertWeight, dateKey, fmtDay, fmtDuration, fmtNum } from '../lib/util';
import type { Exercise } from '../types';
import { ExerciseForm, SearchBox, useExerciseSearch } from './ExercisePicker';
import { MUSCLES } from '../data/exercises';
import { useSettings } from '../state/hooks';

export function HistoryPage() {
  const sessions = useDoneSessions();
  const { push, popAll, setTab } = useNav();
  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof sessions>>();
    for (const s of sessions ?? []) {
      const k = new Date(s.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [sessions]);

  return (
    <Page title="History">
      {sessions === undefined ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          text="Completed workouts will appear here with all your sets and personal bests."
          action={<Button onClick={() => { popAll(); setTab('workouts'); }}>Browse workouts</Button>}
        />
      ) : (
        groups.map(([month, list]) => (
          <div key={month} className="mb-5">
            <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-white/40">{month}</p>
            <ListGroup>
              {list.map((s) => {
                const st = sessionStats(s);
                return (
                  <ListRow key={s.id} icon={Dumbbell} title={s.name} subtitle={`${fmtDay(dateKey(s.startedAt))} • ${fmtDuration(st.duration)} • ${st.sets} sets`} onClick={() => push({ name: 'sessionDetail', id: s.id })} />
                );
              })}
            </ListGroup>
          </div>
        ))
      )}
    </Page>
  );
}

const FILTERS = ['All', ...MUSCLES] as const;

export function LibraryPage() {
  const { q, setQ, muscle, setMuscle, results } = useExerciseSearch();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <Page title="Exercise library" right={<IconButton icon={Plus} label="Create exercise" tone="plain" onClick={() => setCreating(true)} />}>
      <div className="space-y-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search exercises" />
        <Chips options={FILTERS} value={muscle} onChange={setMuscle} />
      </div>
      <div className="mt-4">
        {results.length === 0 ? (
          <EmptyState icon={BookOpen} title="No exercises found" action={<Button icon={Plus} onClick={() => setCreating(true)}>Create exercise</Button>} />
        ) : (
          <ListGroup>
            {results.map((e) => (
              <ListRow key={e.id} title={<>{e.name}{e.custom && <span className="ml-2 text-[12px] text-violet-300">Custom</span>}</>} subtitle={`${e.muscle} • ${e.equipment}`} onClick={() => setSelected(e)} />
            ))}
          </ListGroup>
        )}
      </div>
      <ExerciseInfo exercise={selected} onClose={() => setSelected(null)} />
      <Sheet open={creating} onClose={() => setCreating(false)} title="New exercise">
        <ExerciseForm onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />
      </Sheet>
    </Page>
  );
}

function ExerciseInfo({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const sessions = useDoneSessions();
  const { map } = useExercises();
  const settings = useSettings();
  const { confirm, toast } = useFeedback();
  const unit = settings?.weightUnit ?? 'kg';
  const pr = exercise && sessions ? personalRecords(sessions, map).get(exercise.id) : undefined;
  const last = exercise && sessions ? lastPerformance(exercise.id, sessions) : null;
  const timesDone = exercise && sessions ? sessions.filter((s) => s.exercises.some((e) => e.exerciseId === exercise.id && e.sets.some((x) => x.done))).length : 0;

  const prText = pr
    ? pr.kind === 'weight'
      ? `${fmtNum(convertWeight(pr.value, 'kg', unit), 1)} ${unit} × ${pr.reps}`
      : pr.kind === 'time' ? `${pr.value}s` : `${pr.value} reps`
    : '—';

  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise?.name}>
      {exercise && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pill>{exercise.muscle}</Pill>
            <Pill color="#94a3b8">{exercise.equipment}</Pill>
            <Pill color="#60a5fa">{exercise.mode === 'time' ? 'Timed' : 'Reps'}</Pill>
          </div>
          {exercise.cue && <Card className="p-4"><p className="text-[13px] font-semibold uppercase tracking-wide text-white/40">Form cue</p><p className="mt-1 text-[15px] leading-snug">{exercise.cue}</p></Card>}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center"><Trophy className="mx-auto h-4 w-4 text-amber-300" /><p className="mt-1 truncate text-[14px] font-bold">{prText}</p><p className="text-[11px] text-white/45">Best</p></Card>
            <Card className="p-3 text-center"><p className="mt-5 truncate text-[14px] font-bold">{last ? `${last.set.weight ? `${fmtNum(convertWeight(last.set.weight, last.unit, unit), 1)}×` : ''}${last.set.reps}` : '—'}</p><p className="text-[11px] text-white/45">Last time</p></Card>
            <Card className="p-3 text-center"><p className="mt-5 text-[14px] font-bold">{timesDone}</p><p className="text-[11px] text-white/45">Sessions</p></Card>
          </div>
          {exercise.custom && (
            <Button
              variant="danger" full icon={Trash2}
              onClick={async () => {
                if (!(await confirm({ title: `Delete ${exercise.name}?`, message: 'Past workouts keep their logged sets.', confirmText: 'Delete', danger: true }))) return;
                await db.exercises.delete(exercise.id);
                toast({ title: 'Exercise deleted' });
                onClose();
              }}
            >
              Delete exercise
            </Button>
          )}
          <p className="flex items-center gap-1 text-[12px] text-white/30"><ChevronRight className="h-3 w-3" /> Add it to a workout from the workout editor.</p>
        </div>
      )}
    </Sheet>
  );
}
