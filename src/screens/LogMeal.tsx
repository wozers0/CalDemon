import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, ClipboardPaste, Copy, ExternalLink, ImagePlus, KeyRound, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2, WifiOff } from 'lucide-react';
import { db } from '../db';
import { Sheet } from '../components/Sheet';
import { Button, Card, EmptyState, Field, Segmented, TextArea, TextInput, cn } from '../components/ui';
import { FOOD_DB, GROUP_INFO } from '../data/foods';
import { useFeedback } from '../state/feedback';
import { useOnline, useSettings } from '../state/hooks';
import { foodToItem, rememberFood } from '../lib/actions';
import { CLAUDE_PASTE_PROMPT, GROUPS, MEAL_TYPES, parsePastedReply } from '../lib/nutrition';
import { analyzeMealPhoto } from '../lib/claude';
import { preparePhoto } from '../lib/media';
import { copyText, errorMessage, fmtNum, uid } from '../lib/util';
import type { Food, FoodGroup, FoodItem, Meal, MealType } from '../types';
import { PlateEditor } from './Plate';
import { BarcodeTab } from './Barcode';

type Source = 'search' | 'scan' | 'claude' | 'photo';
const SOURCES: { value: Source; label: string }[] = [
  { value: 'search', label: 'Search' }, { value: 'scan', label: 'Scan' }, { value: 'claude', label: 'Claude' }, { value: 'photo', label: 'Photo AI' },
];
const TYPE_OPTIONS = MEAL_TYPES.map((m) => ({ value: m.id, label: m.id === 'snack' ? 'Snack' : m.label }));

export function LogMealSheet({ open, onClose, date, initialType, onOpenSettings }: { open: boolean; onClose: () => void; date: string; initialType: MealType; onOpenSettings: () => void }) {
  const settings = useSettings();
  const { toast, confirm } = useFeedback();
  const [type, setType] = useState<MealType>(initialType);
  const [source, setSource] = useState<Source>('search');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [origin, setOrigin] = useState<Meal['source']>('manual');
  const [saving, setSaving] = useState(false);
  const showCalories = settings?.showCalories !== false;

  useEffect(() => {
    if (open) {
      setType(initialType);
      setItems([]);
      setPhoto(undefined);
      setOrigin('manual');
    }
  }, [open, initialType]);

  const add = (more: FoodItem[], from: Meal['source'] = 'manual') => {
    setItems((l) => [...l, ...more]);
    if (from !== 'manual') setOrigin(from);
    toast({ title: more.length === 1 ? `${more[0].name} added` : `${more.length} items added`, kind: 'info', duration: 1400 });
  };

  const close = async () => {
    if (items.length && !(await confirm({ title: 'Discard this meal?', message: "The items you've added won't be saved.", confirmText: 'Discard', danger: true }))) return;
    onClose();
  };

  const save = async () => {
    if (!items.length) return;
    setSaving(true);
    try {
      await db.meals.add({ id: uid(), date, type, items, photo, source: origin, createdAt: Date.now() });
      toast({ title: 'Meal saved', description: 'Nice. Fuel for your goals.' });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't save meal", description: errorMessage(e), kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      tall
      title="Log meal"
      footer={<Button full size="lg" loading={saving} disabled={!items.length} onClick={save}>{items.length ? `Save ${items.length} item${items.length > 1 ? 's' : ''}` : 'Add food to save'}</Button>}
    >
      <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} className="mb-3" />

      {items.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[15px] font-semibold">Your plate</p>
            {photo && <img src={photo} alt="Meal" className="h-9 w-9 rounded-lg object-cover" />}
          </div>
          <PlateEditor items={items} onChange={setItems} showCalories={showCalories} />
        </div>
      )}

      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        {SOURCES.map((s) => (
          <button
            key={s.value} type="button" onClick={() => setSource(s.value)}
            className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition', source === s.value ? 'bg-white text-ink-900' : 'bg-white/[0.07] text-white/70')}
          >
            {s.value === 'search' && <Search className="h-4 w-4" />}
            {s.value === 'scan' && <Camera className="h-4 w-4" />}
            {s.value === 'claude' && <ClipboardPaste className="h-4 w-4" />}
            {s.value === 'photo' && <Sparkles className="h-4 w-4" />}
            {s.label}
          </button>
        ))}
      </div>

      <div key={source} className="animate-fade-in">
        {source === 'search' && <SearchTab showCalories={showCalories} onAdd={(f) => { add([foodToItem(f)]); void rememberFood(foodToItem(f), f.source === 'custom' ? 'custom' : 'db'); }} />}
        {source === 'scan' && <BarcodeTab showCalories={showCalories} onAdd={(item, barcode) => { add([item], 'barcode'); void rememberFood(item, 'barcode', barcode); }} />}
        {source === 'claude' && <ClaudePasteTab onItems={(list) => add(list, 'claude-paste')} />}
        {source === 'photo' && (
          <PhotoTab
            apiKey={settings?.apiKey ?? ''}
            model={settings?.model ?? 'claude-opus-5-5'}
            onOpenSettings={onOpenSettings}
            onItems={(list, thumb) => { add(list, 'claude-photo'); setPhoto(thumb); }}
          />
        )}
      </div>
    </Sheet>
  );
}

function SearchTab({ onAdd, showCalories }: { onAdd: (f: Food) => void; showCalories: boolean }) {
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const saved = useLiveQuery(() => db.foods.orderBy('usedAt').reverse().toArray(), []);
  const all = useMemo(() => {
    const names = new Set(FOOD_DB.map((f) => f.name.toLowerCase()));
    return [...FOOD_DB, ...(saved ?? []).filter((f) => !names.has(f.name.toLowerCase()))];
  }, [saved]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return all
      .filter((f) => f.name.toLowerCase().includes(s))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(s)) - Number(a.name.toLowerCase().startsWith(s)) || a.name.length - b.name.length)
      .slice(0, 40);
  }, [q, all]);
  const recent = (saved ?? []).slice(0, 8);
  const popular = useMemo(() => ['Banana', 'Egg', 'Chicken breast (cooked)', 'Greek yogurt (plain)', 'Rolled oats (dry)', 'White rice (cooked)', 'Broccoli', 'Avocado'].map((n) => FOOD_DB.find((f) => f.name === n)!).filter(Boolean), []);

  if (creating) return <CustomFoodForm initialName={q} onCancel={() => setCreating(false)} onSaved={(f) => { setCreating(false); setQ(''); onAdd(f); }} />;

  const list = q.trim() ? results : recent.length ? recent : popular;
  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
        <TextInput type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${FOOD_DB.length}+ foods`} className="pl-10" />
      </div>
      {!q.trim() && <p className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-wide text-white/35">{recent.length ? 'Recent' : 'Popular'}</p>}
      {q.trim() && results.length === 0 ? (
        <EmptyState icon={Search} title="No matches" text="Create it as a custom food, try Scan, or ask Claude." action={<Button icon={Plus} onClick={() => setCreating(true)}>Create “{q.trim().slice(0, 24)}”</Button>} />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {list.map((f) => (
            <button key={f.id} type="button" onClick={() => onAdd(f)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: GROUP_INFO[f.group].color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{f.name}</p>
                <p className="truncate text-[12px] text-white/45">{f.serving}{showCalories ? ` • ${fmtNum(f.kcal)} kcal` : ''} • P {fmtNum(f.protein)} g</p>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-200"><Plus className="h-4 w-4" /></span>
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setCreating(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-[14px] font-semibold text-white/60 active:bg-white/5">
        <Plus className="h-4 w-4" /> Create custom food
      </button>
    </div>
  );
}

function CustomFoodForm({ initialName, onSaved, onCancel }: { initialName: string; onSaved: (f: Food) => void; onCancel: () => void }) {
  const { toast } = useFeedback();
  const [f, setF] = useState({ name: initialName, serving: '1 serving', kcal: '', protein: '', carbs: '', fat: '' });
  const [group, setGroup] = useState<FoodGroup>('other');
  const n = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
  const save = async () => {
    if (!f.name.trim()) return;
    const food: Food = { id: uid(), name: f.name.trim(), serving: f.serving.trim() || '1 serving', kcal: n(f.kcal), protein: n(f.protein), carbs: n(f.carbs), fat: n(f.fat), group, source: 'custom', usedAt: Date.now() };
    try {
      await db.foods.put(food);
      onSaved(food);
    } catch (e) {
      toast({ title: "Couldn't save food", description: errorMessage(e), kind: 'error' });
    }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-semibold">Custom food</p>
      <Field label="Name"><TextInput value={f.name} onChange={set('name')} placeholder="e.g. Mum's lasagne" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Serving"><TextInput value={f.serving} onChange={set('serving')} /></Field>
        <Field label="Energy (kcal)"><TextInput inputMode="decimal" value={f.kcal} onChange={set('kcal')} placeholder="0" /></Field>
        <Field label="Protein (g)"><TextInput inputMode="decimal" value={f.protein} onChange={set('protein')} placeholder="0" /></Field>
        <Field label="Carbs (g)"><TextInput inputMode="decimal" value={f.carbs} onChange={set('carbs')} placeholder="0" /></Field>
        <Field label="Fat (g)"><TextInput inputMode="decimal" value={f.fat} onChange={set('fat')} placeholder="0" /></Field>
      </div>
      <Field label="Food group">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} className={cn('h-8 rounded-full px-3 text-[13px] font-semibold', group === g ? 'text-ink-900' : 'bg-white/[0.06] text-white/60')} style={group === g ? { background: GROUP_INFO[g].color } : undefined}>
              {GROUP_INFO[g].label}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" full onClick={onCancel}>Cancel</Button>
        <Button full onClick={save} disabled={!f.name.trim()}>Save & add</Button>
      </div>
    </div>
  );
}

function ClaudePasteTab({ onItems }: { onItems: (items: FoodItem[]) => void }) {
  const { toast } = useFeedback();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const copy = async () => {
    const ok = await copyText(CLAUDE_PASTE_PROMPT);
    toast(ok ? { title: 'Prompt copied', description: 'Paste it into Claude with your meal photo.' } : { title: "Couldn't copy", description: 'Select and copy the prompt below manually.', kind: 'error' });
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t);
    } catch {
      toast({ title: 'Paste manually', description: 'Tap and hold in the box below, then choose Paste.', kind: 'info' });
    }
  };
  const read = () => {
    setError('');
    setNote('');
    try {
      const parsed = parsePastedReply(text);
      onItems(parsed.items);
      setNote(parsed.notes ?? '');
      setText('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-snug text-white/55">Use your Claude subscription. No API key needed.</p>
      <Step n={1} title="Copy the prompt">
        <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>Copy prompt</Button>
      </Step>
      <Step n={2} title="Send it to Claude with a photo of your meal">
        <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => window.open('https://claude.ai/new', '_blank', 'noopener')}>Open Claude</Button>
      </Step>
      <Step n={3} title="Copy Claude's whole reply and paste it here">
        <TextArea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"meal_name": …}' className="mb-2 font-mono text-[13px]" />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={ClipboardPaste} onClick={paste}>Paste</Button>
          <Button size="sm" onClick={read} disabled={!text.trim()}>Add to meal</Button>
        </div>
      </Step>
      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-200">{error}</p>}
      {note && <p className="rounded-2xl bg-violet-500/10 px-4 py-3 text-[14px] text-violet-100/80">Claude: {note}</p>}
      <details className="rounded-2xl bg-white/[0.03] px-4 py-3 text-[13px] text-white/50">
        <summary className="cursor-pointer font-semibold text-white/70">See the prompt</summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{CLAUDE_PASTE_PROMPT}</pre>
      </details>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/25 text-[13px] font-bold text-violet-200">{n}</span>
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 pt-0.5 text-[15px] font-semibold leading-snug">{title}</p>
          {children}
        </div>
      </div>
    </Card>
  );
}

function PhotoTab({ apiKey, model, onItems, onOpenSettings }: { apiKey: string; model: NonNullable<ReturnType<typeof useSettings>>['model']; onItems: (items: FoodItem[], thumb: string) => void; onOpenSettings: () => void }) {
  const online = useOnline();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState('');
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const lastPhoto = useRef<{ base64: string; thumb: string } | null>(null);

  if (!apiKey) {
    return (
      <EmptyState
        icon={KeyRound}
        title="One-tap photo analysis"
        text="Add a Claude API key in Settings to analyse meal photos automatically. Or use the Claude tab with your subscription."
        action={<Button icon={KeyRound} onClick={onOpenSettings}>Add API key</Button>}
      />
    );
  }

  const run = async (photo: { base64: string; thumb: string }) => {
    setStatus('busy');
    setMessage('');
    try {
      const result = await analyzeMealPhoto({ apiKey, model, base64: photo.base64, hint });
      onItems(result.items, photo.thumb);
      setStatus('done');
      setMessage([result.confidence && `Confidence: ${result.confidence}.`, result.notes].filter(Boolean).join(' '));
    } catch (e) {
      setStatus('error');
      setMessage(errorMessage(e));
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const p = await preparePhoto(file);
      setPreview(p.preview);
      lastPhoto.current = { base64: p.base64, thumb: p.thumb };
      await run(lastPhoto.current);
    } catch (e) {
      setStatus('error');
      setMessage(errorMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {!online && <p className="flex items-center gap-1.5 rounded-2xl bg-amber-400/10 px-4 py-3 text-[14px] text-amber-200"><WifiOff className="h-4 w-4" /> You're offline. Photo analysis needs internet.</p>}
      <button
        type="button" disabled={status === 'busy'} onClick={() => inputRef.current?.click()}
        className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-violet-400/40 bg-violet-500/[0.06] text-center active:bg-violet-500/10"
      >
        {preview ? (
          <>
            <img src={preview} alt="Your meal" className="absolute inset-0 h-full w-full object-cover" />
            {status === 'busy' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 backdrop-blur-[2px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-200" />
                <p className="text-[15px] font-semibold">Analysing your meal…</p>
                <p className="text-[12px] text-white/60">This can take up to 30 seconds</p>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/20 text-violet-200"><ImagePlus className="h-7 w-7" /></span>
            <span className="text-[16px] font-semibold">Take or choose a photo</span>
            <span className="px-8 text-[13px] text-white/45">Claude estimates each food, portion and its macros. You can edit everything before saving.</span>
          </>
        )}
      </button>
      <Field label="Extra details (optional)" hint="Helps accuracy, e.g. “cooked in olive oil, large portion”.">
        <TextInput value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Anything Claude can't see?" />
      </Field>
      {status === 'error' && (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-200">
          {message}
          {lastPhoto.current && <Button size="sm" variant="secondary" icon={RefreshCw} className="mt-2" onClick={() => void run(lastPhoto.current!)}>Try again</Button>}
        </div>
      )}
      {status === 'done' && (
        <div className="flex items-start gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-100/90">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Added to your plate above. {message}</span>
        </div>
      )}
      {preview && status !== 'busy' && (
        <button type="button" onClick={() => { setPreview(''); setStatus('idle'); lastPhoto.current = null; }} className="mx-auto flex items-center gap-1.5 text-[14px] text-white/45">
          <Trash2 className="h-4 w-4" /> Clear photo
        </button>
      )}
    </div>
  );
}

/** Edit or delete a logged meal. */
export function MealEditSheet({ meal, onClose }: { meal: Meal | null; onClose: () => void }) {
  const settings = useSettings();
  const { toast, confirm } = useFeedback();
  const [type, setType] = useState<MealType>('breakfast');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (meal) {
      setType(meal.type);
      setItems(meal.items.map((i) => ({ ...i })));
      setNote(meal.note ?? '');
    }
  }, [meal]);

  const save = async () => {
    if (!meal) return;
    try {
      await db.meals.put({ ...meal, type, items, note: note.trim() || undefined });
      toast({ title: 'Meal updated' });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't update meal", description: errorMessage(e), kind: 'error' });
    }
  };
  const remove = async () => {
    if (!meal || !(await confirm({ title: 'Delete this meal?', confirmText: 'Delete', danger: true }))) return;
    await db.meals.delete(meal.id);
    toast({ title: 'Meal deleted' });
    onClose();
  };

  return (
    <Sheet
      open={!!meal}
      onClose={onClose}
      tall
      title="Edit meal"
      footer={
        <div className="flex gap-2">
          <Button variant="danger" icon={Trash2} onClick={remove} aria-label="Delete meal" />
          <Button full size="lg" onClick={save} disabled={!items.length}>Save changes</Button>
        </div>
      }
    >
      {meal?.photo && <img src={meal.photo} alt="Meal" className="mb-3 h-40 w-full rounded-3xl object-cover" />}
      <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} className="mb-4" />
      {items.length ? (
        <PlateEditor items={items} onChange={setItems} showCalories={settings?.showCalories !== false} />
      ) : (
        <EmptyState icon={Trash2} title="No items left" text="Delete the meal, or close to keep it as it was." />
      )}
      <Field label="Note (optional)" className="mt-4"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did this meal make you feel?" /></Field>
    </Sheet>
  );
}
