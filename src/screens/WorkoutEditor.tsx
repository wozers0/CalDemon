import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Dumbbell, Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import { Page } from '../components/Page';
import { Button, Card, EmptyState, Field, Segmented, Stepper, TextInput } from '../components/ui';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useExercises, useSettings, useTemplates } from '../state/hooks';
import type { PlannedExercise, WorkoutCategory, WorkoutTemplate } from '../types';
import { errorMessage, uid } from '../lib/util';
import { ExercisePicker } from './ExercisePicker';

const CATS: { value: WorkoutCategory; label: string }[] = [
  { value: 'Upper', label: 'Upper' }, { value: 'Lower', label: 'Lower' }, { value: 'Full Body', label: 'Full' }, { value: 'Recovery', label: 'Recovery' },
];

export function WorkoutEditorPage({ id, copyOf }: { id?: string; copyOf?: string }) {
  const { map, loading } = useTemplates();
  const { map: exMap } = useExercises();
  const settings = useSettings();
  const { replace, pop } = useNav();
  const { toast, confirm } = useFeedback();
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('Full Body');
  const [items, setItems] = useState<PlannedExercise[]>([]);
  const [picker, setPicker] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loaded || loading) return;
    const src = map.get(id ?? copyOf ?? '');
    if (src) {
      setName(copyOf ? `${src.name} (My version)` : src.name);
      setSubtitle(src.subtitle);
      setCategory(src.category);
      setItems(src.exercises.map((e) => ({ ...e })));
    }
    setLoaded(true);
  }, [loaded, loading, map, id, copyOf]);

  const change = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setDirty(true);
  };
  const update = (i: number, patch: Partial<PlannedExercise>) => {
    setItems((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setItems((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!name.trim() || !items.length) return;
    setSaving(true);
    try {
      const existing = id ? map.get(id) : undefined;
      const t: WorkoutTemplate = {
        id: existing?.custom ? existing.id : `w-${uid()}`,
        name: name.trim(),
        subtitle: subtitle.trim() || `${items.length} exercises`,
        category,
        exercises: items,
        custom: true,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      await db.workouts.put(t);
      toast({ title: existing ? 'Workout updated' : 'Workout created', description: t.name });
      if (existing) pop();
      else replace({ name: 'workout', id: t.id });
    } catch (e) {
      toast({ title: "Couldn't save workout", description: errorMessage(e), kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const back = async () => {
    if (dirty && !(await confirm({ title: 'Discard changes?', message: "Your edits to this workout won't be saved.", confirmText: 'Discard', danger: true }))) return;
    pop();
  };

  return (
    <Page
      title={id ? 'Edit workout' : 'New workout'}
      backLabel="Cancel"
      onBack={back}
      right={<button type="button" onClick={save} disabled={!name.trim() || !items.length || saving} className="px-2 text-[17px] font-semibold text-violet-300 disabled:opacity-30">Save</button>}
    >
      <div className="space-y-4">
        <Field label="Workout name"><TextInput value={name} onChange={(e) => change(setName)(e.target.value)} placeholder="e.g. Saturday Strength" /></Field>
        <Field label="Focus (optional)"><TextInput value={subtitle} onChange={(e) => change(setSubtitle)(e.target.value)} placeholder="e.g. Chest • Back • Core" /></Field>
        <Field label="Category"><Segmented options={CATS} value={category} onChange={change(setCategory)} /></Field>
      </div>

      <div className="mb-2.5 mt-6 flex items-center justify-between px-1">
        <h2 className="text-[20px] font-bold">Exercises</h2>
        <span className="text-[14px] text-white/45">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Dumbbell} title="No exercises yet" text="Add exercises from the library or create your own." />
      ) : (
        <div className="space-y-2.5">
          {items.map((p, i) => {
            const ex = exMap.get(p.exerciseId);
            return (
              <Card key={`${p.exerciseId}-${i}`} className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold">{ex?.name ?? 'Exercise'}</p>
                    <p className="text-[13px] text-white/45">{ex?.muscle}</p>
                  </div>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="Remove exercise" onClick={() => { setItems((l) => l.filter((_, idx) => idx !== i)); setDirty(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/15 text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[12px] text-white/45">Sets</p>
                    <Stepper label="sets" value={p.sets} min={1} max={10} onChange={(v) => update(i, { sets: v })} />
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] text-white/45">{ex?.mode === 'time' ? 'Seconds' : 'Target reps'}</p>
                    <TextInput value={p.target} onChange={(e) => update(i, { target: e.target.value.slice(0, 8) })} className="h-10 py-0 text-center" inputMode="text" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <p className="text-[13px] text-white/45">Rest between sets</p>
                    <Stepper label="rest" value={p.restSec} min={0} max={600} step={15} format={(v) => `${v}s`} onChange={(v) => update(i, { restSec: v })} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="secondary" full icon={Plus} className="mt-3" onClick={() => setPicker(true)}>Add exercise</Button>
      {(!name.trim() || !items.length) && <p className="mt-3 text-center text-[13px] text-white/35">Add a name and at least one exercise to save.</p>}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        selectedIds={items.map((i) => i.exerciseId)}
        onPick={(e) => {
          setItems((l) => [...l, { exerciseId: e.id, sets: 3, target: e.mode === 'time' ? '30' : '8-12', restSec: settings?.defaultRest ?? 90 }]);
          setDirty(true);
          toast({ title: `${e.name} added`, kind: 'info', duration: 1500 });
        }}
      />
    </Page>
  );
}
