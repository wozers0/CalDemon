import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Droplet, GlassWater, Minus, Plus, Salad, Utensils } from 'lucide-react';
import { db } from '../db';
import { BarChart } from '../components/Charts';
import { Card, IconButton, ScreenHeader, Segmented, SectionTitle, SegmentRing, Skeleton, cn } from '../components/ui';
import { GROUP_INFO } from '../data/foods';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useSettings, useToday } from '../state/hooks';
import { addWater } from '../lib/actions';
import { BALANCED_RANGES, GROUPS, MACRO_COLORS, MEAL_TYPES, groupServings, guessMealType, macroSplit, mealTitle, sumItems, sumMeals } from '../lib/nutrition';
import { addDays, fmtDay, fmtLitres, fmtNum, lastNDays, weekdayShort } from '../lib/util';
import type { Meal, MealType } from '../types';
import { LogMealSheet, MealEditSheet } from './LogMeal';

export function NutritionScreen() {
  const today = useToday();
  const settings = useSettings();
  const { push } = useNav();
  const { toast } = useFeedback();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState(today);
  const [logType, setLogType] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<Meal | null>(null);
  const meals = useLiveQuery(() => db.meals.where('date').equals(day).sortBy('createdAt'), [day]);
  const water = useLiveQuery(async () => (await db.water.get(day))?.ml ?? 0, [day]);
  const showCalories = settings?.showCalories !== false;
  const isToday = day === today;

  return (
    <div className="pb-6">
      <ScreenHeader title="Nutrition" right={<IconButton icon={Plus} label="Log meal" tone="accent" onClick={() => setLogType(isToday ? guessMealType() : 'lunch')} />} />
      <div className="px-5">
        <Segmented options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Last 7 days' }]} value={view} onChange={setView} className="mb-4" />
        {view === 'day' ? (
          <div key="day" className="animate-tab">
            <div className="mb-3 flex items-center justify-between">
              <IconButton icon={ChevronLeft} label="Previous day" onClick={() => setDay(addDays(day, -1))} />
              <button type="button" onClick={() => setDay(today)} className="text-[17px] font-semibold active:opacity-60">{fmtDay(day)}</button>
              <IconButton icon={ChevronRight} label="Next day" disabled={isToday} onClick={() => setDay(addDays(day, 1))} />
            </div>
            {meals === undefined ? <Skeleton className="h-56" /> : <DaySummary meals={meals} showCalories={showCalories} />}
            <WaterCard
              ml={water ?? 0}
              goal={settings?.waterGoal ?? 2500}
              step={settings?.waterStep ?? 250}
              onAdd={async (d) => {
                try {
                  const before = water ?? 0;
                  await addWater(day, d);
                  const goal = settings?.waterGoal ?? 2500;
                  if (before < goal && before + d >= goal) toast({ title: 'Water goal reached 💧', description: 'Your body thanks you!' });
                } catch {
                  toast({ title: "Couldn't save water", kind: 'error' });
                }
              }}
            />
            {MEAL_TYPES.map((mt) => {
              const list = (meals ?? []).filter((m) => m.type === mt.id);
              const t = sumMeals(list);
              return (
                <div key={mt.id}>
                  <SectionTitle title={mt.label} className="mt-5" />
                  <div className="space-y-2">
                    {list.map((m) => <MealRow key={m.id} meal={m} showCalories={showCalories} onClick={() => setEditing(m)} />)}
                    <button
                      type="button" onClick={() => setLogType(mt.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] py-3 text-[14px] font-semibold text-white/55 active:bg-white/[0.04]"
                    >
                      <Plus className="h-4 w-4" /> Add {mt.id === 'snack' ? 'a snack' : mt.label.toLowerCase()}
                      {list.length > 0 && showCalories && <span className="font-normal text-white/35">• {fmtNum(t.kcal)} kcal so far</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <WeekView today={today} showCalories={showCalories} waterGoal={settings?.waterGoal ?? 2500} />
        )}
      </div>
      <LogMealSheet
        open={logType !== null}
        onClose={() => setLogType(null)}
        date={day}
        initialType={logType ?? 'lunch'}
        onOpenSettings={() => { setLogType(null); push({ name: 'settings' }); }}
      />
      <MealEditSheet meal={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DaySummary({ meals, showCalories }: { meals: Meal[]; showCalories: boolean }) {
  const t = sumMeals(meals);
  const split = macroSplit(t);
  const groups = groupServings(meals);
  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-5">
          <SegmentRing size={124} stroke={12} segments={[{ value: t.protein * 4, color: MACRO_COLORS.protein }, { value: t.carbs * 4, color: MACRO_COLORS.carbs }, { value: t.fat * 9, color: MACRO_COLORS.fat }]}>
            <div>
              <p className="tabular text-[24px] font-bold leading-none">{showCalories ? fmtNum(t.kcal) : meals.length}</p>
              <p className="mt-1 text-[11px] text-white/45">{showCalories ? 'kcal' : meals.length === 1 ? 'meal' : 'meals'}</p>
            </div>
          </SegmentRing>
          <div className="min-w-0 flex-1 space-y-2.5">
            {(['protein', 'carbs', 'fat'] as const).map((k) => {
              const [lo, hi] = BALANCED_RANGES[k];
              const pct = split[k];
              const inRange = meals.length > 0 && pct >= lo && pct <= hi;
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 capitalize text-white/65"><span className="h-2 w-2 rounded-full" style={{ background: MACRO_COLORS[k] }} />{k}</span>
                    <span className="tabular font-semibold">{fmtNum(t[k])} g <span className="font-normal text-white/40">{fmtNum(pct)}%</span></span>
                  </div>
                  <div className="relative mt-1 h-1.5 rounded-full bg-white/[0.07]">
                    <div className="absolute h-full rounded-full bg-white/[0.12]" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                    <div className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-full transition-[left] duration-700" style={{ left: `calc(${Math.min(98, pct)}% - 3px)`, background: MACRO_COLORS[k], opacity: meals.length ? 1 : 0, boxShadow: inRange ? `0 0 8px ${MACRO_COLORS[k]}` : undefined }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] leading-snug text-white/35">Shaded band = balanced range of daily energy</p>
          </div>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[15px] font-semibold"><Salad className="h-5 w-5 text-emerald-400" /> Balanced plate</p>
          <span className="text-[12px] text-white/40">servings</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GROUPS.filter((g) => g !== 'other').map((g) => {
            const info = GROUP_INFO[g];
            const v = groups[g];
            const met = info.aim !== undefined && v >= info.aim;
            return (
              <div key={g} className={cn('rounded-2xl px-3 py-2.5', met ? 'bg-white/[0.07]' : 'bg-white/[0.03]')}>
                <p className="truncate text-[12px] text-white/50">{info.label}</p>
                <p className="tabular text-[17px] font-bold" style={{ color: met ? info.color : undefined }}>
                  {fmtNum(v, 1)}<span className="text-[12px] font-medium text-white/35"> / {info.aim}+</span>
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] leading-snug text-white/40">Aims are gentle targets to include, never limits. Every food fits.</p>
      </Card>
    </>
  );
}

function WaterCard({ ml, goal, step, onAdd }: { ml: number; goal: number; step: number; onAdd: (delta: number) => void }) {
  const glasses = Math.max(8, Math.ceil(goal / 250));
  const filled = Math.floor(ml / 250);
  return (
    <Card className="mt-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold"><Droplet className="h-5 w-5 text-sky-400" /> Water</p>
          <p className="tabular mt-0.5 text-[24px] font-bold">{fmtLitres(ml)} <span className="text-[14px] font-medium text-white/40">of {fmtLitres(goal)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton icon={Minus} label="Remove water" disabled={ml <= 0} onClick={() => onAdd(-step)} />
          <button type="button" onClick={() => onAdd(step)} className="flex h-10 items-center gap-1 rounded-full bg-sky-400/20 px-4 text-[15px] font-semibold text-sky-200 active:scale-95">
            <Plus className="h-4 w-4" />{step} ml
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: Math.min(glasses, 16) }, (_, i) => (
          <GlassWater key={i} className={cn('h-6 w-6 transition-colors', i < filled ? 'text-sky-400' : 'text-white/12')} strokeWidth={1.8} />
        ))}
      </div>
    </Card>
  );
}

function MealRow({ meal, showCalories, onClick }: { meal: Meal; showCalories: boolean; onClick: () => void }) {
  const t = sumItems(meal.items);
  const main = meal.items[0]?.group ?? 'other';
  return (
    <Card onClick={onClick} className="p-3" label={`Edit ${mealTitle(meal)}`}>
      <div className="flex items-center gap-3">
        {meal.photo ? (
          <img src={meal.photo} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${GROUP_INFO[main].color}22`, color: GROUP_INFO[main].color }}>
            <Utensils className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{mealTitle(meal)}</p>
          <p className="tabular truncate text-[12px] text-white/45">P {fmtNum(t.protein)} g • C {fmtNum(t.carbs)} g • F {fmtNum(t.fat)} g</p>
        </div>
        {showCalories && <span className="tabular shrink-0 text-[14px] font-semibold text-white/80">{fmtNum(t.kcal)} kcal</span>}
      </div>
    </Card>
  );
}

function WeekView({ today, showCalories, waterGoal }: { today: string; showCalories: boolean; waterGoal: number }) {
  const days = useMemo(() => lastNDays(7, today), [today]);
  const meals = useLiveQuery(() => db.meals.where('date').between(days[0], days[6], true, true).toArray(), [days[0], days[6]]);
  const water = useLiveQuery(() => db.water.where('date').between(days[0], days[6], true, true).toArray(), [days[0], days[6]]);
  if (!meals || !water) return <Skeleton className="h-64" />;
  const byDay = days.map((d) => sumMeals(meals.filter((m) => m.date === d)));
  const logged = days.filter((d) => meals.some((m) => m.date === d)).length;
  const avg = sumMeals(meals);
  const split = macroSplit(avg);
  const metric = showCalories ? 'kcal' : 'protein';
  return (
    <div key="week" className="animate-tab space-y-3">
      <Card className="p-4">
        <p className="text-[15px] font-semibold">{showCalories ? 'Energy' : 'Protein'} per day</p>
        <p className="mb-2 text-[13px] text-white/45">{logged} of 7 days logged</p>
        <BarChart data={days.map((d, i) => ({ label: weekdayShort(d).slice(0, 2), value: byDay[i][metric], highlight: d === today }))} format={(v) => (showCalories ? fmtNum(v) : `${fmtNum(v)}g`)} />
      </Card>
      <Card className="p-4">
        <p className="mb-3 text-[15px] font-semibold">Average balance</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
          {(['protein', 'carbs', 'fat'] as const).map((k) => <div key={k} style={{ width: `${split[k]}%`, background: MACRO_COLORS[k] }} className="transition-[width] duration-700" />)}
        </div>
        <div className="mt-3 grid grid-cols-3 text-center">
          {(['protein', 'carbs', 'fat'] as const).map((k) => (
            <div key={k}>
              <p className="tabular text-[18px] font-bold">{fmtNum(split[k])}%</p>
              <p className="text-[12px] capitalize text-white/45">{k} <span className="text-white/30">({BALANCED_RANGES[k][0]}-{BALANCED_RANGES[k][1]}%)</span></p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <p className="mb-2 text-[15px] font-semibold">Water</p>
        <BarChart color="#38bdf8" data={days.map((d) => ({ label: weekdayShort(d).slice(0, 2), value: water.find((w) => w.date === d)?.ml ?? 0, highlight: d === today }))} format={(v) => fmtLitres(v)} />
        <p className="mt-1 text-[13px] text-white/45">Goal reached on {water.filter((w) => w.ml >= waterGoal).length} of 7 days</p>
      </Card>
    </div>
  );
}
