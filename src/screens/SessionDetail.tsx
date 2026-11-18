import { useMemo } from 'react';
import { CalendarDays, Clock, Dumbbell, Layers, RotateCcw, Trash2, Trophy, Weight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Page } from '../components/Page';
import { Button, Card, EmptyState, IconButton, Pill, Skeleton } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useDoneSessions, useExercises, useTemplates } from '../state/hooks';
import { useStartWorkout } from '../lib/actions';
import { prsInSession, sessionStats } from '../lib/stats';
import { dateKey, fmtDay, fmtDuration, fmtNum, fmtTime } from '../lib/util';
import { FEELINGS } from './Session';

export function SessionDetailPage({ id, fresh }: { id: string; fresh?: boolean }) {
  const session = useLiveQuery(() => db.sessions.get(id), [id], null);
  const history = useDoneSessions();
  const { map: exMap } = useExercises();
  const { map: templates } = useTemplates();
  const { pop } = useNav();
  const { confirm, toast } = useFeedback();
  const startWorkout = useStartWorkout();
  const prs = useMemo(() => (session && history ? prsInSession(session, history, exMap) : []), [session, history, exMap]);

  if (session === null) return <Page title="Workout"><div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-28" /></div></Page>;
  if (!session) return <Page title="Workout"><EmptyState icon={Dumbbell} title="Workout not found" text="It may have been deleted." /></Page>;

  const st = sessionStats(session);
  const template = session.templateId ? templates.get(session.templateId) : undefined;
  const feeling = session.feeling ? FEELINGS[session.feeling - 1] : undefined;
  const volume = session.unit === 'kg' ? st.volumeKg : st.volumeKg / 0.45359237;

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this workout?', message: 'It will be removed from your history and stats.', confirmText: 'Delete', danger: true }))) return;
    await db.sessions.delete(session.id);
    toast({ title: 'Workout deleted' });
    pop();
  };

  return (
    <Page
      title={fresh ? 'Summary' : session.name}
      backLabel={fresh ? 'Done' : 'Back'}
      right={<IconButton icon={Trash2} label="Delete workout" tone="plain" onClick={remove} />}
      footer={template ? <Button full size="lg" variant="secondary" icon={RotateCcw} onClick={() => void startWorkout(template)}>Repeat this workout</Button> : undefined}
    >
      {fresh && (
        <div className="animate-pop mb-4 rounded-[26px] bg-linear-to-br from-violet-500/30 via-violet-700/15 to-transparent p-5 text-center glow-purple">
          <p className="text-[44px] leading-none">🏆</p>
          <p className="mt-2 text-[22px] font-bold">Workout complete!</p>
          <p className="mt-1 text-[14px] text-white/60">Every session makes you stronger. Remember to refuel and hydrate.</p>
        </div>
      )}
      <h1 className="text-[26px] font-bold tracking-tight">{session.name}</h1>
      <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-white/50">
        <CalendarDays className="h-4 w-4" /> {fmtDay(dateKey(session.startedAt))} at {fmtTime(session.startedAt)}
        {feeling && <span className="ml-1">• {feeling.emoji} {feeling.label}</span>}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Tile icon={Clock} label="Duration" value={fmtDuration(st.duration)} />
        <Tile icon={Layers} label="Sets" value={String(st.sets)} />
        <Tile icon={Weight} label="Volume" value={`${fmtNum(volume)} ${session.unit}`} />
      </div>

      {prs.length > 0 && (
        <Card className="mt-3 border-amber-300/20 bg-amber-300/[0.06] p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-amber-200"><Trophy className="h-5 w-5" /> New personal best{prs.length > 1 ? 's' : ''}!</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prs.map((p) => <Pill key={p} color="#fcd34d">{exMap.get(p)?.name ?? 'Exercise'}</Pill>)}
          </div>
        </Card>
      )}

      <div className="mt-4 space-y-2.5">
        {session.exercises.map((e, i) => {
          const ex = exMap.get(e.exerciseId);
          const timeMode = ex?.mode === 'time';
          return (
            <Card key={`${e.exerciseId}-${i}`} className="p-4">
              <p className="text-[16px] font-semibold">{ex?.name ?? 'Exercise'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.sets.map((s, si) => (
                  <span key={si} className={`rounded-lg px-2.5 py-1 text-[13px] font-medium ${s.done ? 'bg-white/[0.08]' : 'bg-white/[0.03] text-white/30 line-through'}`}>
                    {s.weight ? `${fmtNum(s.weight, 1)} ${session.unit} × ` : ''}{s.reps ?? 0}{timeMode ? 's' : ''}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {session.notes && (
        <Card className="mt-3 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-white/40">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-[15px] text-white/80">{session.notes}</p>
        </Card>
      )}
    </Page>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-800 px-2 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-violet-300" />
      <p className="tabular mt-1 truncate text-[16px] font-bold">{value}</p>
      <p className="text-[12px] text-white/45">{label}</p>
    </div>
  );
}
