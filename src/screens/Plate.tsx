import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Field, Stepper, TextInput, cn } from '../components/ui';
import { GROUP_INFO } from '../data/foods';
import { GROUPS, itemTotals, sumItems } from '../lib/nutrition';
import { fmtNum } from '../lib/util';
import type { FoodGroup, FoodItem } from '../types';

/** Editable list of food items with portions and totals. */
export function PlateEditor({ items, onChange, showCalories }: { items: FoodItem[]; onChange: (items: FoodItem[]) => void; showCalories: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const totals = sumItems(items);
  const update = (i: number, patch: Partial<FoodItem>) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const t = itemTotals(item);
          const g = GROUP_INFO[item.group];
          const expanded = open === i;
          return (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.04]">
              <div className="flex items-center gap-3 p-3">
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: g.color }} />
                <button type="button" onClick={() => setOpen(expanded ? null : i)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                  <p className="truncate text-[15px] font-semibold">{item.name}</p>
                  <p className="truncate text-[12px] text-white/45">
                    {item.serving}{showCalories ? ` • ${fmtNum(t.kcal)} kcal` : ''} • P {fmtNum(t.protein)} C {fmtNum(t.carbs)} F {fmtNum(t.fat)}
                  </p>
                </button>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/30 transition', expanded && 'rotate-180')} />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 pb-3">
                <Stepper label="servings" value={item.qty} step={0.5} min={0.5} max={20} format={(v) => `${v}×`} onChange={(v) => update(i, { qty: v })} />
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => { setOpen(null); onChange(items.filter((_, idx) => idx !== i)); }} className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/10 text-rose-300 active:bg-rose-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {expanded && <ItemFields item={item} onChange={(p) => update(i, p)} />}
            </div>
          );
        })}
      </div>
      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-violet-500/10 px-4 py-3 text-[14px]">
          <span className="font-semibold text-violet-200">Total</span>
          <span className="tabular text-white/80">
            {showCalories && <b className="text-white">{fmtNum(totals.kcal)} kcal • </b>}P {fmtNum(totals.protein)} g • C {fmtNum(totals.carbs)} g • F {fmtNum(totals.fat)} g
          </span>
        </div>
      )}
    </div>
  );
}

function ItemFields({ item, onChange }: { item: FoodItem; onChange: (p: Partial<FoodItem>) => void }) {
  const num = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
  return (
    <div className="space-y-3 border-t border-white/[0.06] p-3">
      <p className="text-[12px] text-white/40">Values are per serving. Adjust them if you know better.</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name" className="col-span-2"><TextInput value={item.name} onChange={(e) => onChange({ name: e.target.value })} /></Field>
        <Field label="Serving"><TextInput value={item.serving} onChange={(e) => onChange({ serving: e.target.value })} /></Field>
        <Field label="Energy (kcal)"><TextInput inputMode="decimal" defaultValue={item.kcal} onChange={(e) => onChange({ kcal: num(e.target.value) })} /></Field>
        <Field label="Protein (g)"><TextInput inputMode="decimal" defaultValue={item.protein} onChange={(e) => onChange({ protein: num(e.target.value) })} /></Field>
        <Field label="Carbs (g)"><TextInput inputMode="decimal" defaultValue={item.carbs} onChange={(e) => onChange({ carbs: num(e.target.value) })} /></Field>
        <Field label="Fat (g)"><TextInput inputMode="decimal" defaultValue={item.fat} onChange={(e) => onChange({ fat: num(e.target.value) })} /></Field>
      </div>
      <Field label="Food group">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g: FoodGroup) => (
            <button
              key={g} type="button" onClick={() => onChange({ group: g })}
              className={cn('h-8 rounded-full px-3 text-[13px] font-semibold', item.group === g ? 'text-ink-900' : 'bg-white/[0.06] text-white/60')}
              style={item.group === g ? { background: GROUP_INFO[g].color } : undefined}
            >
              {GROUP_INFO[g].label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
