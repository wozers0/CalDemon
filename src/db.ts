import Dexie, { type Table } from 'dexie';
import type {
  BadgeUnlock, CheckIn, Exercise, Food, KV, Meal, Milestone, Settings, WaterDay, Win, WorkoutSession, WorkoutTemplate,
} from './types';

class CalDemonDB extends Dexie {
  sessions!: Table<WorkoutSession, string>;
  workouts!: Table<WorkoutTemplate, string>;
  exercises!: Table<Exercise, string>;
  meals!: Table<Meal, string>;
  foods!: Table<Food, string>;
  water!: Table<WaterDay, string>;
  checkins!: Table<CheckIn, string>;
  wins!: Table<Win, string>;
  milestones!: Table<Milestone, string>;
  badges!: Table<BadgeUnlock, string>;
  kv!: Table<KV, string>;

  constructor() {
    super('caldemon');
    this.version(1).stores({
      sessions: 'id, status, startedAt, templateId',
      workouts: 'id, createdAt',
      exercises: 'id, name',
      meals: 'id, date, createdAt',
      foods: 'id, name, barcode, usedAt',
      water: 'date',
      checkins: 'date',
      wins: 'id, date, createdAt',
      milestones: 'id, createdAt',
      badges: 'id, unlockedAt',
      kv: 'key',
    });
  }
}

export const db = new CalDemonDB();

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  weightUnit: 'kg',
  waterGoal: 2500,
  waterStep: 250,
  weeklyTarget: 3,
  defaultRest: 90,
  sound: true,
  showCalories: true,
  apiKey: '',
  model: 'claude-opus-5-5',
  favoriteQuotes: [],
  onboarded: false,
};

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...current, ...patch } });
}

export const ALL_TABLES = [
  'sessions', 'workouts', 'exercises', 'meals', 'foods', 'water', 'checkins', 'wins', 'milestones', 'badges', 'kv',
] as const;
