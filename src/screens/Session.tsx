import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, Minus, Plus, Timer, Trash2, X } from 'lucide-react';
import { db } from '../db';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { Button, Card, EmptyState, ScalePicker, Skeleton, TextArea, cn } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useRestTimer } from '../state/timer';
import { useDoneSessions, useExercises, useSettings } from '../state/hooks';
import { sessionExerciseFrom } from '../lib/actions';
import { sessionStats } from '../lib/stats';
import { unlockAudio } from '../lib/media';
import { convertWeight, errorMessage, fmtClock, fmtNum } from '../lib/util';
import type { SetLog, WorkoutSession } from '../types';
import { ExercisePicker } from './ExercisePicker';

export const FEELINGS = [
  { emoji: '😮‍💨', label: 'Tough' }, { emoji: '😐', label: 'Okay' }, { emoji: '🙂', label: 'Good' }, { emoji: '💪', label: 'Strong' }, { emoji: '🔥', label: 'Amazing' },
];

export function SessionPage({ id }: { id: string }) {
  const { map: exMap } = useExercises();
  const settings = useSettings();
  const history = useDoneSessions();
  const { pop, replace } = useNav();
  const { toast, confirm } = useFeedback();
  const timer = useRestTimer();
  const [session, setSession] = useState<WorkoutSession | null | undefined>(undefined);
  const [picker, setPicker] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [openCue, setOpenCue] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    db.sessions.get(id).then((s) => setSession(s ?? null)).catch(() => setSession(null));
  }, [id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // previous performance for each exercise, per set index
  const previous = useMemo(() => {
    const m = new Map<string, { sets: SetLog[]; unit: 'kg' | 'lb' }>();
    for (const s of history ?? []) {
      for (const e of s.exercises) if (!m.has(e.exerciseId) && e.sets.some((x) => x.done)) m.set(e.exerciseId, { sets: e.sets.filter((x) => x.done), unit: s.unit });
    }
    return m;
  }, [history]);

  if (session === undefined) return <Page title="Workout"><div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div></Page>;
  if (session === null || session.status !== 'active') {
    return <Page title="Workout"><EmptyState icon={Timer} title="This workout has ended" text="Find it in your workout history." /></Page>;
  }

  const persist = (next: WorkoutSession) => {
    setSession(next);
    db.sessions.put(next).catch((e) => toast({ title: "Couldn't save progress", description: errorMessage(e), kind: 'error' }));
  };
  const mutate = (fn: (s: WorkoutSession) => void) => {
    const next: WorkoutSession = structuredClone(session);
    fn(next);
    persist(next);
  };

  const toggleSet = (ei: number, si: number) => {
    unlockAudio();
    const e = session.exercises[ei];
    const set = e.sets[si];
    const becomingDone = !set.done;
    mutate((s) => {
      const target = s.exercises[ei].sets[si];
      target.done = becomingDone;
      if (becomingDone && target.reps == null) {
        const n = parseInt(e.target, 10);
        target.reps = Number.isFinite(n) ? n : null;
      }
    });
    if (becomingDone && e.restSec > 0) timer.start(e.restSec, exMap.get(e.exerciseId)?.name ?? '');
  };

  const { sets: doneSets, volumeKg } = sessionStats(session);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  const finish = async () => {
    if (doneSets === 0) {
      const discard = await confirm({ title: 'No sets completed yet', message: 'Tick off sets as you go. Do you want to discard this workout?', confirmText: 'Discard workout', cancelText: 'Keep training', danger: true });
      if (discard) await discardNow();
      return;
    }
    setFinishOpen(true);
  };

  const discardNow = async () => {
    try {
      await db.sessions.delete(session.id);
      timer.stop();
      toast({ title: 'Workout discarded', kind: 'info' });
      pop();
    } catch (e) {
      toast({ title: "Couldn't discard", description: errorMessage(e), kind: 'error' });
    }
  };

  const discard = async () => {
    if (await confirm({ title: 'Discard this workout?', message: 'All sets logged in this session will be deleted.', confirmText: 'Discard workout', danger: true })) await discardNow();
  };

  const complete = async (feeling: number, notes: string) => {
    const done: WorkoutSession = {
      ...session,
      exercises: session.exercises.filter((e) => e.sets.some((s) => s.done)),
      status: 'done',
      endedAt: Date.now(),
      feeling,
      notes: notes.trim() || undefined,
    };
    try {
      await db.sessions.put(done);
      timer.stop();
      setFinishOpen(false);
      replace({ name: 'sessionDetail', id: done.id, fresh: true });
    } catch (e) {
      toast({ title: "Couldn't save workout", description: errorMessage(e), kind: 'error' });
    }
  };

  return (
    <Page
      title={session.name}
      backLabel="Hide"
      right={<button type="button" onClick={finish} className="rounded-full bg-violet-500 px-4 py-1.5 text-[15px] font-semibold active:scale-95">Finish</button>}
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Time" value={fmtClock((now - session.startedAt) / 1000)} />
        <Stat label="Sets" value={`${doneSets}/${totalSets}`} />
        <Stat label="Volume" value={`${fmtNum(session.unit === 'kg' ? volumeKg : volumeKg / 0.45359237)} ${session.unit}`} />
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-400 transition-[width] duration-500" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      <div className="space-y-3">
        {session.exercises.map((e, ei) => {
          const ex = exMap.get(e.exerciseId);
          const weighted = ex?.weighted ?? true;
          const timeMode = ex?.mode === 'time';
          const prev = previous.get(e.exerciseId);
          const cols = weighted ? 'grid-cols-[28px_1fr_1fr_1fr_40px]' : 'grid-cols-[28px_1fr_1fr_40px]';
          return (
            <Card key={`${e.exerciseId}-${ei}`} className="p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold leading-tight">{ex?.name ?? 'Exercise'}</p>
                  <p className="mt-0.5 text-[13px] text-white/45">
                    Target {e.target}{timeMode ? 's' : ' reps'}{e.restSec ? ` • ${e.restSec}s rest` : ''}
                  </p>
                </div>
                {ex?.cue && <button type="button" aria-label="Form tip" onClick={() => setOpenCue(openCue === ei ? null : ei)} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/60"><Info className="h-4 w-4" /></button>}
                <button
                  type="button" aria-label="Remove exercise"
                  onClick={async () => {
                    if (await confirm({ title: `Remove ${ex?.name ?? 'exercise'}?`, confirmText: 'Remove', danger: true })) mutate((s) => void s.exercises.splice(ei, 1));
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {openCue === ei && ex?.cue && <p className="mt-2 rounded-xl bg-violet-500/10 px-3 py-2 text-[13px] leading-snug text-violet-100/80">{ex.cue}</p>}

              <div className={cn('mt-3 grid items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/35', cols)}>
                <span>Set</span>
                <span>Previous</span>
                {weighted && <span className="text-center">{session.unit}</span>}
                <span className="text-center">{timeMode ? 'Sec' : 'Reps'}</span>
                <span />
              </div>
              <div className="mt-1 space-y-1.5">
                {e.sets.map((set, si) => {
                  const p = prev?.sets[si];
                  const prevText = p ? `${p.weight ? `${fmtNum(convertWeight(p.weight, prev!.unit, session.unit), 1)}×` : ''}${p.reps ?? ''}` : '—';
                  return (
                    <div key={si} className={cn('grid items-center gap-2 rounded-xl px-1 py-1 transition-colors', cols, set.done && 'bg-emerald-400/[0.09]')}>
                      <span className={cn('text-center text-[15px] font-bold', set.done ? 'text-emerald-300' : 'text-white/60')}>{si + 1}</span>
                      <span className="truncate text-[13px] text-white/40">{prevText}</span>
                      {weighted && (
                        <NumberCell label={`Set ${si + 1} weight`} decimal value={set.weight} placeholder="0" onChange={(v) => mutate((s) => void (s.exercises[ei].sets[si].weight = v))} />
                      )}
                      <NumberCell label={`Set ${si + 1} ${timeMode ? 'seconds' : 'reps'}`} value={set.reps} placeholder={e.target} onChange={(v) => mutate((s) => void (s.exercises[ei].sets[si].reps = v))} />
                      <button
                        type="button" aria-label={set.done ? `Undo set ${si + 1}` : `Complete set ${si + 1}`} aria-pressed={set.done}
                        onClick={() => toggleSet(ei, si)}
                        className={cn('grid h-10 w-10 place-items-center rounded-xl transition active:scale-90', set.done ? 'bg-emerald-400 text-ink-900' : 'bg-white/[0.08] text-white/50')}
                      >
                        <Check className="h-5 w-5" strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => mutate((s) => { const sets = s.exercises[ei].sets; const last = sets[sets.length - 1]; sets.push({ reps: null, weight: last?.weight ?? null, done: false }); })}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] text-[14px] font-semibold active:bg-white/10"
                >
                  <Plus className="h-4 w-4" /> Add set
                </button>
                <button
                  type="button" aria-label="Remove last set" disabled={e.sets.length <= 1}
                  onClick={() => mutate((s) => void s.exercises[ei].sets.pop())}
                  className="grid h-10 w-12 place-items-center rounded-xl bg-white/[0.06] active:bg-white/10 disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Button variant="secondary" full icon={Plus} className="mt-3" onClick={() => setPicker(true)}>Add exercise</Button>
      <Button variant="danger" full icon={Trash2} className="mt-3" onClick={discard}>Discard workout</Button>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        selectedIds={session.exercises.map((e) => e.exerciseId)}
        onPick={(ex) => {
          mutate((s) => void s.exercises.push(sessionExerciseFrom(ex.id, 3, ex.mode === 'time' ? '30' : '8-12', settings?.defaultRest ?? 90, history ?? [], s.unit)));
          setPicker(false);
          toast({ title: `${ex.name} added`, kind: 'info', duration: 1500 });
        }}
      />
      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} onSave={complete} sets={doneSets} duration={(now - session.startedAt) / 1000} />
    </Page>
  );
}

function FinishSheet({ open, onClose, onSave, sets, duration }: { open: boolean; onClose: () => void; onSave: (feeling: number, notes: string) => Promise<void>; sets: number; duration: number }) {
  const [feeling, setFeeling] = useState(4);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Finish workout"
      footer={<Button full size="lg" loading={saving} onClick={async () => { setSaving(true); await onSave(feeling, notes); setSaving(false); }}>Save workout</Button>}
    >
      <div className="mb-5 rounded-3xl bg-linear-to-br from-violet-500/25 to-violet-900/10 p-5 text-center">
        <p className="text-[40px] leading-none">💪</p>
        <p className="mt-2 text-[20px] font-bold">You showed up. That's what counts.</p>
        <p className="mt-1 text-[14px] text-white/55">{sets} sets in {fmtClock(duration)}</p>
      </div>
      <p className="mb-2 px-1 text-[15px] font-semibold">How did it feel?</p>
      <ScalePicker label="How did it feel" value={feeling} onChange={setFeeling} options={FEELINGS} />
      <p className="mb-2 mt-5 px-1 text-[15px] font-semibold">Notes (optional)</p>
      <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember for next time?" />
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-800 px-2 py-2.5 text-center">
      <p className="tabular truncate text-[18px] font-bold">{value}</p>
      <p className="text-[12px] text-white/45">{label}</p>
    </div>
  );
}

/** Numeric input that keeps the typed text (e.g. "22.") while exposing a number. */
function NumberCell({ value, onChange, placeholder, decimal, label }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; decimal?: boolean; label: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : String(value));
  }, [value]);
  return (
    <input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        const el = e.currentTarget;
        setTimeout(() => el.setSelectionRange(0, el.value.length), 0);
      }}
      onBlur={() => {
        focused.current = false;
        setText(value == null ? '' : String(value));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').slice(0, 6);
        setText(t);
        const n = t === '' ? null : parseFloat(t);
        onChange(n == null || Number.isNaN(n) ? null : n);
      }}
      className="h-10 w-full min-w-0 rounded-xl bg-white/[0.07] text-center text-[16px] font-semibold outline-none focus:bg-white/[0.12] focus:ring-2 focus:ring-violet-400/60"
    />
  );
}
