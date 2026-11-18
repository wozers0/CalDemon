import type { Snapshot } from '../lib/stats';
import { activeDays, hasBalancedPlateDay, longestStreak, sessionStats, waterGoalDays } from '../lib/stats';
import { weekStart, dateKey } from '../lib/util';

export type BadgeIcon =
  | 'dumbbell' | 'flame' | 'crown' | 'gem' | 'calendar' | 'sunrise' | 'moon' | 'trophy' | 'weight' | 'droplet' | 'waves'
  | 'salad' | 'book' | 'bed' | 'heart' | 'zap' | 'rocket' | 'hammer' | 'star' | 'flag' | 'leaf';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  color: string;
  earned: (s: Snapshot, ctx: Ctx) => boolean;
}

interface Ctx {
  days: Set<string>;
  longest: number;
}

const workoutsPerWeek = (s: Snapshot) => {
  const m = new Map<string, number>();
  s.sessions.forEach((x) => {
    const w = weekStart(dateKey(x.startedAt));
    m.set(w, (m.get(w) ?? 0) + 1);
  });
  return Math.max(0, ...m.values());
};

export const BADGES: BadgeDef[] = [
  { id: 'first-rep', title: 'First Rep', description: 'Complete your first workout.', icon: 'dumbbell', color: '#a78bfa', earned: (s) => s.sessions.length >= 1 },
  { id: 'getting-rolling', title: 'Getting Rolling', description: 'Complete 5 workouts.', icon: 'zap', color: '#c084fc', earned: (s) => s.sessions.length >= 5 },
  { id: 'consistency-king', title: 'Consistency King', description: 'Complete 21 workouts.', icon: 'crown', color: '#fbbf24', earned: (s) => s.sessions.length >= 21 },
  { id: 'iron-devotion', title: 'Iron Devotion', description: 'Complete 50 workouts.', icon: 'gem', color: '#60a5fa', earned: (s) => s.sessions.length >= 50 },
  { id: 'weekly-win', title: 'Weekly Win', description: 'Hit your weekly workout target.', icon: 'calendar', color: '#34d399', earned: (s) => workoutsPerWeek(s) >= s.settings.weeklyTarget },
  { id: 'early-bird', title: 'Early Bird', description: 'Finish a workout before 8 am.', icon: 'sunrise', color: '#fb923c', earned: (s) => s.sessions.some((x) => new Date(x.endedAt ?? x.startedAt).getHours() < 8) },
  { id: 'night-owl', title: 'Night Owl', description: 'Train after 9 pm.', icon: 'moon', color: '#818cf8', earned: (s) => s.sessions.some((x) => new Date(x.startedAt).getHours() >= 21) },
  { id: 'ten-tonne', title: 'Ten Tonne Club', description: 'Lift 10,000 kg in total.', icon: 'weight', color: '#f472b6', earned: (s) => s.sessions.reduce((a, x) => a + sessionStats(x).volumeKg, 0) >= 10000 },
  { id: 'hydrated', title: 'Hydrated', description: 'Reach your water goal for a day.', icon: 'droplet', color: '#38bdf8', earned: (s) => waterGoalDays(s) >= 1 },
  { id: 'hydro-hero', title: 'Hydro Hero', description: 'Reach your water goal on 7 days.', icon: 'waves', color: '#22d3ee', earned: (s) => waterGoalDays(s) >= 7 },
  { id: 'balanced-plate', title: 'Balanced Plate', description: 'Eat 5 servings of fruit & veg in a day.', icon: 'salad', color: '#4ade80', earned: (s) => hasBalancedPlateDay(s.meals) },
  { id: 'fuel-journal', title: 'Fuel Journal', description: 'Log meals on 7 different days.', icon: 'book', color: '#facc15', earned: (s) => new Set(s.meals.map((m) => m.date)).size >= 7 },
  { id: 'recovery-pro', title: 'Recovery Pro', description: 'Log 3 rest days. Recovery is training too.', icon: 'bed', color: '#2dd4bf', earned: (s) => s.checkins.filter((c) => c.restDay).length >= 3 },
  { id: 'zen-demon', title: 'Zen Demon', description: 'Complete a recovery or mobility workout.', icon: 'leaf', color: '#86efac', earned: (s) => s.sessions.some((x) => x.category === 'Recovery') },
  { id: 'self-aware', title: 'Self-Aware', description: 'Complete 7 daily check-ins.', icon: 'heart', color: '#fb7185', earned: (s) => s.checkins.length >= 7 },
  { id: 'on-fire', title: 'On Fire', description: 'Reach a 7-day show-up streak.', icon: 'flame', color: '#f97316', earned: (_s, c) => c.longest >= 7 },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Reach a 30-day show-up streak.', icon: 'rocket', color: '#e879f9', earned: (_s, c) => c.longest >= 30 },
  { id: 'architect', title: 'Architect', description: 'Build your own custom workout.', icon: 'hammer', color: '#a3a3a3', earned: (s) => s.customWorkouts >= 1 },
  { id: 'wins-collector', title: 'Wins Collector', description: 'Record 5 wins in your journal.', icon: 'star', color: '#fde047', earned: (s) => s.wins.length >= 5 },
  { id: 'milestone-maker', title: 'Milestone Maker', description: 'Complete a personal milestone.', icon: 'flag', color: '#a78bfa', earned: (s) => s.milestones.some((m) => m.done) },
  { id: 'trophy-case', title: 'Trophy Case', description: 'Unlock 10 badges.', icon: 'trophy', color: '#fbbf24', earned: (s) => s.badges.length >= 10 },
];

export function earnedBadgeIds(s: Snapshot): string[] {
  const days = activeDays(s);
  const ctx: Ctx = { days, longest: longestStreak(days) };
  return BADGES.filter((b) => {
    try {
      return b.earned(s, ctx);
    } catch {
      return false;
    }
  }).map((b) => b.id);
}
