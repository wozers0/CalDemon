import { db, getSettings } from '../db';
import type {
  BadgeUnlock, CheckIn, Exercise, Meal, Milestone, Settings, WaterDay, Win, WorkoutSession, WorkoutTemplate,
} from '../types';
import { addDays, dateKey, toKg, weekStart } from './util';
import { groupServings } from './nutrition';

export interface Snapshot {
  sessions: WorkoutSession[];
  meals: Meal[];
  water: WaterDay[];
  checkins: CheckIn[];
  wins: Win[];
  milestones: Milestone[];
  badges: BadgeUnlock[];
  customWorkouts: number;
  settings: Settings;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const [sessions, meals, water, checkins, wins, milestones, badges, customWorkouts, settings] = await Promise.all([
    db.sessions.where('status').equals('done').toArray(),
    db.meals.toArray(),
    db.water.toArray(),
    db.checkins.toArray(),
    db.wins.toArray(),
    db.milestones.toArray(),
    db.badges.toArray(),
    db.workouts.count(),
    getSettings(),
  ]);
  return { sessions, meals, water, checkins, wins, milestones, badges, customWorkouts, settings };
}

export function sessionStats(s: WorkoutSession) {
  let sets = 0;
  let volume = 0;
  for (const e of s.exercises) {
    for (const set of e.sets) {
      if (!set.done) continue;
      sets++;
      if (set.weight && set.reps) volume += toKg(set.weight, s.unit) * set.reps;
    }
  }
  const duration = (s.endedAt ?? Date.now()) - s.startedAt;
  return { sets, volumeKg: volume, duration };
}

/** Days with any logged activity. Rest-day check-ins count too. */
export function activeDays(s: Pick<Snapshot, 'sessions' | 'meals' | 'water' | 'checkins'>): Set<string> {
  const days = new Set<string>();
  s.sessions.forEach((x) => days.add(dateKey(x.startedAt)));
  s.meals.forEach((m) => days.add(m.date));
  s.water.forEach((w) => w.ml > 0 && days.add(w.date));
  s.checkins.forEach((c) => days.add(c.date));
  return days;
}

/** Current streak: counts back from today, or from yesterday if today isn't logged yet (no penalty mid-day). */
export function currentStreak(days: Set<string>): number {
  let key = dateKey();
  if (!days.has(key)) key = addDays(key, -1);
  let n = 0;
  while (days.has(key)) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

export function longestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of sorted) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function workoutsThisWeek(sessions: WorkoutSession[]): number {
  const start = weekStart(dateKey());
  return sessions.filter((s) => dateKey(s.startedAt) >= start).length;
}

export interface PR {
  exerciseId: string;
  value: number;
  reps: number;
  kind: 'weight' | 'reps' | 'time';
  unit: 'kg' | 'lb';
  at: number;
}

/** Best performance per exercise (heaviest weight; most reps or longest hold for bodyweight). */
export function personalRecords(sessions: WorkoutSession[], exercises: Map<string, Exercise>): Map<string, PR> {
  const prs = new Map<string, PR>();
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const s of ordered) {
    for (const e of s.exercises) {
      const ex = exercises.get(e.exerciseId);
      for (const set of e.sets) {
        if (!set.done || !set.reps) continue;
        const kind: PR['kind'] = ex?.mode === 'time' ? 'time' : ex?.weighted && set.weight ? 'weight' : 'reps';
        const value = kind === 'weight' ? toKg(set.weight ?? 0, s.unit) : set.reps;
        const cur = prs.get(e.exerciseId);
        const better = !cur || value > cur.value || (kind === 'weight' && value === cur.value && set.reps > cur.reps);
        if (better) prs.set(e.exerciseId, { exerciseId: e.exerciseId, value, reps: set.reps, kind, unit: 'kg', at: s.endedAt ?? s.startedAt });
      }
    }
  }
  return prs;
}

/** Number of exercises in `session` that beat all earlier sessions. */
export function prsInSession(session: WorkoutSession, history: WorkoutSession[], exercises: Map<string, Exercise>): string[] {
  const earlier = history.filter((s) => s.id !== session.id && s.startedAt < session.startedAt);
  const before = personalRecords(earlier, exercises);
  const after = personalRecords([...earlier, session], exercises);
  const out: string[] = [];
  for (const [id, pr] of after) {
    const prev = before.get(id);
    if (prev && (pr.value > prev.value || (pr.value === prev.value && pr.reps > prev.reps && pr.kind === 'weight'))) out.push(id);
  }
  return out;
}

export function lastPerformance(exerciseId: string, sessions: WorkoutSession[], excludeId?: string) {
  const sorted = [...sessions].filter((s) => s.id !== excludeId && s.status === 'done').sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId);
    const done = e?.sets.filter((x) => x.done && x.reps);
    if (done?.length) {
      const best = done.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
      return { set: best, unit: s.unit, at: s.startedAt };
    }
  }
  return null;
}

export function waterGoalDays(s: Pick<Snapshot, 'water' | 'settings'>): number {
  return s.water.filter((w) => w.ml >= s.settings.waterGoal).length;
}

export function xpTotal(s: Snapshot): number {
  const sets = s.sessions.reduce((a, x) => a + sessionStats(x).sets, 0);
  const mealDays = new Set(s.meals.map((m) => m.date)).size;
  return (
    s.sessions.length * 100 + sets * 5 + mealDays * 20 + waterGoalDays(s) * 20 + s.checkins.length * 15 +
    s.wins.length * 10 + s.milestones.filter((m) => m.done).length * 50 + s.badges.length * 50
  );
}

const LEVEL_TITLES: [number, string][] = [
  [20, 'Overlord'], [15, 'Demon Lord'], [11, 'Archdemon'], [8, 'Demon'], [5, 'Fiend'], [3, 'Hellion'], [1, 'Imp'],
];

export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 150)) + 1;
  const floor = 150 * (level - 1) ** 2;
  const next = 150 * level ** 2;
  const title = LEVEL_TITLES.find(([min]) => level >= min)?.[1] ?? 'Imp';
  return { level, title, progress: (xp - floor) / (next - floor), toNext: next - xp };
}

export function hasBalancedPlateDay(meals: Meal[]): boolean {
  const byDay = new Map<string, Meal[]>();
  meals.forEach((m) => byDay.set(m.date, [...(byDay.get(m.date) ?? []), m]));
  for (const list of byDay.values()) {
    const g = groupServings(list);
    if (g.veg + g.fruit >= 5) return true;
  }
  return false;
}

export function readiness(c?: CheckIn) {
  if (!c) return { level: 'unknown' as const, title: 'How are you feeling?', text: 'A 10-second check-in tailors today\'s suggestion.' };
  if (c.restDay) return { level: 'rest' as const, title: 'Rest & recharge', text: 'Rest days build strength. Enjoy a walk, stretch and good food.' };
  if (c.soreness >= 4 || c.energy <= 2 || c.sleep <= 2) {
    return { level: 'easy' as const, title: 'Take it easy today', text: 'Your body could use some recovery. Mobility or a light session is a great choice.' };
  }
  if (c.energy + c.sleep + c.mood - c.soreness >= 9) {
    return { level: 'go' as const, title: 'Primed to train', text: 'Energy looks great. A good day to work on strength.' };
  }
  return { level: 'steady' as const, title: 'Steady day', text: 'Train at a comfortable effort and listen to your body.' };
}

/** Workouts suggested for today, based on recovery and what's been trained least recently. */
export function recommend(templates: WorkoutTemplate[], sessions: WorkoutSession[], checkin?: CheckIn): WorkoutTemplate[] {
  const r = readiness(checkin);
  const lastDone = new Map<string, number>();
  sessions.forEach((s) => s.templateId && lastDone.set(s.templateId, Math.max(lastDone.get(s.templateId) ?? 0, s.startedAt)));
  const recovery = templates.filter((t) => t.category === 'Recovery');
  const training = templates
    .filter((t) => t.category !== 'Recovery')
    .map((t, i) => ({ t, i, last: lastDone.get(t.id) ?? 0 }))
    .sort((a, b) => a.last - b.last || a.i - b.i)
    .map((x) => x.t);
  if (r.level === 'easy' || r.level === 'rest') return [...recovery, ...training.slice(0, 2)];
  return [...training.slice(0, 3), ...recovery.slice(0, 1)];
}

export function estimateMinutes(t: WorkoutTemplate, exercises: Map<string, Exercise>): number {
  let sec = 0;
  for (const p of t.exercises) {
    const ex = exercises.get(p.exerciseId);
    const work = ex?.mode === 'time' ? parseInt(p.target, 10) || 45 : 40;
    sec += p.sets * (work + p.restSec);
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}
