import type { FoodGroup, FoodItem, Meal, MealType } from '../types';

export interface Totals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const MEAL_TYPES: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

export const GROUPS: FoodGroup[] = ['veg', 'fruit', 'protein', 'grain', 'dairy', 'fats', 'other'];

export function guessMealType(d = new Date()): MealType {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export function itemTotals(i: FoodItem): Totals {
  return { kcal: i.kcal * i.qty, protein: i.protein * i.qty, carbs: i.carbs * i.qty, fat: i.fat * i.qty };
}

export function sumItems(items: FoodItem[]): Totals {
  return items.reduce((a, i) => {
    const t = itemTotals(i);
    return { kcal: a.kcal + t.kcal, protein: a.protein + t.protein, carbs: a.carbs + t.carbs, fat: a.fat + t.fat };
  }, ZERO);
}

export function sumMeals(meals: Meal[]): Totals {
  return sumItems(meals.flatMap((m) => m.items));
}

export function groupServings(meals: Meal[]): Record<FoodGroup, number> {
  const out = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<FoodGroup, number>;
  for (const m of meals) for (const i of m.items) out[i.group] = (out[i.group] ?? 0) + i.qty;
  return out;
}

/** Percentage of energy from each macro. */
export function macroSplit(t: Totals): { protein: number; carbs: number; fat: number } {
  const p = t.protein * 4;
  const c = t.carbs * 4;
  const f = t.fat * 9;
  const sum = p + c + f;
  if (!sum) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: (p / sum) * 100, carbs: (c / sum) * 100, fat: (f / sum) * 100 };
}

/** Widely used balanced ranges (% of energy). */
export const BALANCED_RANGES = {
  protein: [10, 35],
  carbs: [45, 65],
  fat: [20, 35],
} as const;

export const MACRO_COLORS = { protein: '#a78bfa', carbs: '#fbbf24', fat: '#2dd4bf' };

export function mealTitle(m: Meal): string {
  if (!m.items.length) return 'Meal';
  const names = m.items.map((i) => i.name);
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
}

export const CLAUDE_PASTE_PROMPT = `I'm logging a meal in my food journal. Look at my photo (or description) and estimate what's in it.

Reply with ONLY a JSON object in exactly this format, no other text:
{
  "meal_name": "short name",
  "items": [
    { "name": "food", "portion": "e.g. 1 cup / 150 g", "grams": 150, "calories": 250, "protein_g": 30, "carbs_g": 10, "fat_g": 8, "group": "protein" }
  ],
  "confidence": "low | medium | high",
  "notes": "one short neutral sentence"
}

"group" must be one of: veg, fruit, protein, grain, dairy, fats, other.
Keep the tone neutral and supportive. Don't judge the meal or suggest eating less.`;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
};

export interface ParsedMeal {
  mealName: string;
  items: FoodItem[];
  confidence?: string;
  notes?: string;
}

/** Converts Claude's JSON (from the API or pasted from the Claude app) into journal items. */
export function itemsFromClaudeJSON(data: unknown): ParsedMeal {
  if (!data || typeof data !== 'object') throw new Error('The reply is not a JSON object.');
  const obj = data as Record<string, unknown>;
  const raw = Array.isArray(obj.items) ? obj.items : Array.isArray(data) ? (data as unknown[]) : null;
  if (!raw || !raw.length) throw new Error('No food items were found in the reply.');
  const items: FoodItem[] = raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const group = String(o.group ?? 'other').toLowerCase() as FoodGroup;
    return {
      name: String(o.name ?? 'Food').slice(0, 80),
      serving: String(o.portion ?? o.serving ?? (o.grams ? `${num(o.grams)} g` : '1 portion')).slice(0, 40),
      qty: 1,
      kcal: num(o.calories ?? o.kcal),
      protein: num(o.protein_g ?? o.protein),
      carbs: num(o.carbs_g ?? o.carbs ?? o.carbohydrates),
      fat: num(o.fat_g ?? o.fat),
      group: GROUPS.includes(group) ? group : 'other',
    };
  });
  return {
    mealName: String(obj.meal_name ?? obj.name ?? ''),
    items,
    confidence: obj.confidence ? String(obj.confidence) : undefined,
    notes: obj.notes ? String(obj.notes) : undefined,
  };
}

/** Tolerant parser for text pasted from the Claude app (handles code fences and extra prose). */
export function parsePastedReply(text: string): ParsedMeal {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error("Couldn't find the JSON in the reply. Make sure you copied Claude's whole answer.");
  let data: unknown;
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("The reply looks incomplete. Copy Claude's whole answer and try again.");
  }
  return itemsFromClaudeJSON(data);
}
