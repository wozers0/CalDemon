export type Tab = 'home' | 'workouts' | 'nutrition' | 'progress' | 'motivation';

export type Muscle = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Glutes' | 'Core' | 'Full Body' | 'Mobility' | 'Cardio';
export type WorkoutCategory = 'Upper' | 'Lower' | 'Full Body' | 'Recovery';

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: string;
  /** 'reps' = count repetitions, 'time' = hold/duration in seconds */
  mode: 'reps' | 'time';
  /** whether a weight field is shown */
  weighted: boolean;
  cue?: string;
  custom?: boolean;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  /** target text such as "8-10" or "30" */
  target: string;
  restSec: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  subtitle: string;
  category: WorkoutCategory;
  exercises: PlannedExercise[];
  custom?: boolean;
  createdAt?: number;
}

export interface SetLog {
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  target: string;
  restSec: number;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  templateId?: string;
  name: string;
  category?: WorkoutCategory;
  unit: 'kg' | 'lb';
  status: 'active' | 'done';
  startedAt: number;
  endedAt?: number;
  exercises: SessionExercise[];
  feeling?: number;
  notes?: string;
}

export type FoodGroup = 'veg' | 'fruit' | 'protein' | 'grain' | 'dairy' | 'fats' | 'other';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  group: FoodGroup;
  source?: 'db' | 'custom' | 'barcode';
  barcode?: string;
  usedAt?: number;
}

export interface FoodItem {
  name: string;
  serving: string;
  qty: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  group: FoodGroup;
}

export interface Meal {
  id: string;
  date: string;
  type: MealType;
  items: FoodItem[];
  photo?: string;
  note?: string;
  source?: 'manual' | 'barcode' | 'claude-paste' | 'claude-photo';
  createdAt: number;
}

export interface WaterDay {
  date: string;
  ml: number;
}

export interface CheckIn {
  date: string;
  energy: number;
  sleep: number;
  soreness: number;
  mood: number;
  restDay?: boolean;
  createdAt: number;
}

export interface Win {
  id: string;
  date: string;
  text: string;
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

export interface BadgeUnlock {
  id: string;
  unlockedAt: number;
}

export type ClaudeModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5';

export interface Settings {
  name: string;
  weightUnit: 'kg' | 'lb';
  waterGoal: number;
  waterStep: number;
  weeklyTarget: number;
  defaultRest: number;
  sound: boolean;
  showCalories: boolean;
  apiKey: string;
  model: ClaudeModel;
  favoriteQuotes: number[];
  onboarded: boolean;
}

export interface KV {
  key: string;
  value: unknown;
}
