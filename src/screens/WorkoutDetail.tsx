import { Clock, Copy, Layers, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import { db } from '../db';
import { Page } from '../components/Page';
import { Button, Card, EmptyState, IconButton, Pill } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useDoneSessions, useExercises, useTemplates } from '../state/hooks';
import { useStartWorkout } from '../lib/actions';
import { estimateMinutes } from '../lib/stats';
import { fmtDay, dateKey } from '../lib/util';
import { CATEGORY_STYLE } from './Workouts';

export function WorkoutDetailPage({ id }: { id: string }) {
  const { map, loading } = useTemplates();
  const { map: exMap } = useExercises();
  const sessions = useDoneSessions();
  const { push, pop } = useNav();
  const { confirm, toast } = useFeedback();
  const startWorkout = useStartWorkout();
  const t = map.get(id);

  if (!t) {
    return (
      <Page title="Workout">
        {!loading && <EmptyState icon={Layers} title="Workout not found" text="It may have been deleted." />}
      </Page>
    );
  }

  const st = CATEGORY_STYLE[t.category];
  const last = sessions?.find((s) => s.templateId === t.id);
  const totalSets = t.exercises.reduce((a, e) => a + e.sets, 0);

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${t.name}?`, message: 'Your workout history stays safe.', confirmText: 'Delete workout', danger: true }))) return;
    await db.workouts.delete(t.id);
    toast({ title: 'Workout deleted' });
    pop();
  };

  return (
    <Page
      title={t.name}
      right={
        t.custom ? (
          <>
            <IconButton icon={Trash2} label="Delete workout" tone="plain" onClick={remove} />
            <IconButton icon={Pencil} label="Edit workout" tone="plain" onClick={() => push({ name: 'editor', id: t.id })} />
          </>
        ) : (
          <IconButton icon={Copy} label="Duplicate and customise" tone="plain" onClick={() => push({ name: 'editor', copyOf: t.id })} />
        )
      }
      footer={<Button full size="lg" icon={Play} onClick={() => void startWorkout(t)}>Start Workout</Button>}
    >
      <div className="relative -mx-5 -mt-4 mb-5 overflow-hidden px-5 pb-5 pt-6" style={{ background: `radial-gradient(100% 120% at 90% 0%, ${st.color}40 0%, transparent 60%)` }}>
        <Pill color={st.color}>{t.category}{t.custom ? ' • Custom' : ''}</Pill>
        <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight">{t.name}</h1>
        <p className="text-[15px] text-white/55">{t.subtitle}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Exercises" value={t.exercises.length} />
          <Stat label="Sets" value={totalSets} />
          <Stat label="Minutes" value={`~${estimateMinutes(t, exMap)}`} />
        </div>
        {last && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-white/45">
            <RotateCcw className="h-3.5 w-3.5" /> Last done {fmtDay(dateKey(last.startedAt)).toLowerCase()}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        {t.exercises.map((p, i) => {
          const ex = exMap.get(p.exerciseId);
          const unit = ex?.mode === 'time' ? 's' : ' reps';
          return (
            <Card key={`${p.exerciseId}-${i}`} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[14px] font-bold text-white/70">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                  <p className="text-[13px] text-white/50">
                    {p.sets} × {p.target}{unit}{p.restSec ? ` • ${p.restSec}s rest` : ''}
                  </p>
                  {ex?.cue && <p className="mt-1.5 text-[13px] leading-snug text-white/40">{ex.cue}</p>}
                </div>
                {ex && <Pill color="#94a3b8" className="shrink-0">{ex.muscle}</Pill>}
              </div>
            </Card>
          );
        })}
      </div>
      {!t.custom && (
        <button type="button" onClick={() => push({ name: 'editor', copyOf: t.id })} className="mx-auto mt-5 flex items-center gap-1.5 text-[15px] font-medium text-violet-300 active:opacity-60">
          <Copy className="h-4 w-4" /> Duplicate & customise
        </button>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/30"><Clock className="h-3.5 w-3.5" /> Warm up for 5-10 minutes before you start.</p>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5 text-center backdrop-blur">
      <p className="text-[20px] font-bold">{value}</p>
      <p className="text-[12px] text-white/45">{label}</p>
    </div>
  );
}
