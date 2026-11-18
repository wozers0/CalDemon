import { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { db } from '../db';
import { Sheet } from '../components/Sheet';
import { Button, Chips, EmptyState, Field, Segmented, TextInput, Toggle, cn } from '../components/ui';
import { MUSCLES } from '../data/exercises';
import { useExercises } from '../state/hooks';
import { useFeedback } from '../state/feedback';
import type { Exercise, Muscle } from '../types';
import { errorMessage, uid } from '../lib/util';

const FILTERS = ['All', ...MUSCLES] as const;
type Filter = (typeof FILTERS)[number];

export function useExerciseSearch() {
  const { list } = useExercises();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Filter>('All');
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list
      .filter((e) => (muscle === 'All' || e.muscle === muscle) && (!s || e.name.toLowerCase().includes(s) || e.equipment.toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list, q, muscle]);
  return { q, setQ, muscle, setMuscle, results };
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" type="search" enterKeyHint="search" />
    </div>
  );
}

export function ExercisePicker({ open, onClose, onPick, selectedIds = [] }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; selectedIds?: string[] }) {
  const { q, setQ, muscle, setMuscle, results } = useExerciseSearch();
  const [creating, setCreating] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'New exercise' : 'Add exercise'} tall>
      {creating ? (
        <ExerciseForm
          initialName={q}
          onCancel={() => setCreating(false)}
          onSaved={(e) => {
            setCreating(false);
            onPick(e);
          }}
        />
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-ink-850 px-5 pb-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search exercises" />
            <Chips options={FILTERS} value={muscle} onChange={setMuscle} />
          </div>
          <button type="button" onClick={() => setCreating(true)} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-violet-400/40 px-4 py-3 text-left text-violet-200 active:bg-violet-500/10">
            <Plus className="h-5 w-5" /> Create custom exercise
          </button>
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No matches" text="Try another search or create your own exercise." className="mt-2" />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {results.map((e) => {
                const picked = selectedIds.includes(e.id);
                return (
                  <button key={e.id} type="button" onClick={() => onPick(e)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-medium">{e.name}{e.custom && <span className="ml-2 text-[12px] text-violet-300">Custom</span>}</p>
                      <p className="text-[13px] text-white/45">{e.muscle} • {e.equipment}</p>
                    </div>
                    <span className={cn('grid h-8 w-8 place-items-center rounded-full', picked ? 'bg-violet-500 text-white' : 'bg-white/[0.07] text-violet-300')}>
                      {picked ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

export function ExerciseForm({ initialName = '', onSaved, onCancel }: { initialName?: string; onSaved: (e: Exercise) => void; onCancel: () => void }) {
  const { toast } = useFeedback();
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<Muscle>('Chest');
  const [equipment, setEquipment] = useState('');
  const [mode, setMode] = useState<'reps' | 'time'>('reps');
  const [weighted, setWeighted] = useState(true);
  const [cue, setCue] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const e: Exercise = { id: `custom-${uid()}`, name: name.trim(), muscle, equipment: equipment.trim() || 'Any', mode, weighted, cue: cue.trim() || undefined, custom: true };
      await db.exercises.add(e);
      toast({ title: 'Exercise created', description: e.name });
      onSaved(e);
    } catch (err) {
      toast({ title: "Couldn't save exercise", description: errorMessage(err), kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-2">
      <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Lateral Raise" autoFocus /></Field>
      <Field label="Muscle group">
        <div className="flex flex-wrap gap-2">
          {MUSCLES.map((m) => (
            <button key={m} type="button" onClick={() => setMuscle(m)} className={cn('h-9 rounded-full px-3.5 text-[14px] font-semibold', m === muscle ? 'bg-violet-500' : 'bg-white/[0.07] text-white/70')}>
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Equipment"><TextInput value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. Cable, Dumbbells, None" /></Field>
      <Field label="Tracked by">
        <Segmented options={[{ value: 'reps', label: 'Repetitions' }, { value: 'time', label: 'Time (seconds)' }]} value={mode} onChange={setMode} />
      </Field>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
        <span className="text-[16px]">Uses added weight</span>
        <Toggle label="Uses added weight" checked={weighted} onChange={setWeighted} />
      </div>
      <Field label="Coaching cue (optional)"><TextInput value={cue} onChange={(e) => setCue(e.target.value)} placeholder="A reminder for good form" /></Field>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" full onClick={onCancel}>Cancel</Button>
        <Button full onClick={save} loading={saving} disabled={!name.trim()}>Save exercise</Button>
      </div>
    </div>
  );
}
