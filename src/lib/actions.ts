import { useCallback } from 'react';
import { db, getSettings } from '../db';
import type { Exercise, Food, FoodItem, SessionExercise, WorkoutSession, WorkoutTemplate } from '../types';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { lastPerformance } from './stats';
import { convertWeight, errorMessage, uid } from './util';

export async function addWater(date: string, delta: number) {
  await db.transaction('rw', db.water, async () => {
    const cur = await db.water.get(date);
    await db.water.put({ date, ml: Math.max(0, (cur?.ml ?? 0) + delta) });
  });
}

export function sessionExerciseFrom(exerciseId: string, sets: number, target: string, restSec: number, history: WorkoutSession[], unit: 'kg' | 'lb'): SessionExercise {
  const last = lastPerformance(exerciseId, history);
  const weight = last?.set.weight ? convertWeight(last.set.weight, last.unit, unit) : null;
  return {
    exerciseId,
    target,
    restSec,
    sets: Array.from({ length: Math.max(1, sets) }, () => ({ reps: null, weight, done: false })),
  };
}

async function createSession(t: WorkoutTemplate): Promise<string> {
  const settings = await getSettings();
  const history = await db.sessions.where('status').equals('done').toArray();
  const session: WorkoutSession = {
    id: uid(),
    templateId: t.id,
    name: t.name,
    category: t.category,
    unit: settings.weightUnit,
    status: 'active',
    startedAt: Date.now(),
    exercises: t.exercises.map((p) => sessionExerciseFrom(p.exerciseId, p.sets, p.target, p.restSec, history, settings.weightUnit)),
  };
  await db.sessions.add(session);
  return session.id;
}

/** Starts a workout, handling an already-active session. */
export function useStartWorkout() {
  const { push } = useNav();
  const { confirm, toast } = useFeedback();
  return useCallback(
    async (t: WorkoutTemplate) => {
      try {
        const active = await db.sessions.where('status').equals('active').first();
        if (active) {
          const discard = await confirm({
            title: `${active.name} is still in progress`,
            message: 'Discard it and start a new workout? Logged sets in that session will be lost.',
            confirmText: 'Discard & start new',
            cancelText: 'Keep current workout',
            danger: true,
          });
          if (!discard) {
            push({ name: 'session', id: active.id });
            return;
          }
          await db.sessions.delete(active.id);
        }
        const id = await createSession(t);
        push({ name: 'session', id });
      } catch (e) {
        toast({ title: "Couldn't start workout", description: errorMessage(e), kind: 'error' });
      }
    },
    [push, confirm, toast],
  );
}

/** Remembers a food for "Recent" in search. */
export async function rememberFood(item: FoodItem, source: Food['source'] = 'db', barcode?: string) {
  const existing = barcode ? await db.foods.where('barcode').equals(barcode).first() : await db.foods.where('name').equals(item.name).first();
  const food: Food = {
    id: existing?.id ?? uid(),
    name: item.name,
    serving: item.serving,
    kcal: item.kcal,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    group: item.group,
    source: existing?.source ?? source,
    barcode: barcode ?? existing?.barcode,
    usedAt: Date.now(),
  };
  await db.foods.put(food);
}

export function foodToItem(f: Food, qty = 1): FoodItem {
  return { name: f.name, serving: f.serving, qty, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, group: f.group };
}

export function exerciseName(map: Map<string, Exercise>, id: string) {
  return map.get(id)?.name ?? 'Exercise';
}
