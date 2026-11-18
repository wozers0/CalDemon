import type { PlannedExercise, WorkoutTemplate } from '../types';

const ex = (exerciseId: string, sets: number, target: string, restSec = 90): PlannedExercise => ({ exerciseId, sets, target, restSec });

export const BUILT_IN_WORKOUTS: WorkoutTemplate[] = [
  {
    id: 'push-day', name: 'Push Day', subtitle: 'Chest • Shoulders • Triceps', category: 'Upper',
    exercises: [ex('bench-press', 4, '8-10', 120), ex('shoulder-press', 3, '8-10'), ex('incline-db-press', 3, '10-12'), ex('lateral-raise', 3, '12-15', 60), ex('tricep-pushdown', 3, '10-12', 60)],
  },
  {
    id: 'pull-day', name: 'Pull Day', subtitle: 'Back • Rear Delts • Biceps', category: 'Upper',
    exercises: [ex('lat-pulldown', 4, '8-10', 120), ex('barbell-row', 3, '8-10'), ex('seated-row', 3, '10-12'), ex('face-pull', 3, '12-15', 60), ex('bicep-curl', 3, '10-12', 60)],
  },
  {
    id: 'leg-day', name: 'Leg Day', subtitle: 'Quads • Hamstrings • Glutes', category: 'Lower',
    exercises: [ex('back-squat', 4, '6-8', 150), ex('rdl', 3, '8-10', 120), ex('leg-press', 3, '10-12'), ex('lunge', 3, '10', 90), ex('calf-raise', 3, '12-15', 60)],
  },
  {
    id: 'upper-strength', name: 'Upper Strength', subtitle: 'Press • Row • Arms', category: 'Upper',
    exercises: [ex('overhead-press', 4, '5-6', 150), ex('pull-up', 4, '5-8', 120), ex('db-bench-press', 3, '8-10'), ex('db-row', 3, '10'), ex('hammer-curl', 2, '12', 60), ex('skull-crusher', 2, '12', 60)],
  },
  {
    id: 'lower-glutes', name: 'Glutes & Hamstrings', subtitle: 'Hinge • Bridge • Split squat', category: 'Lower',
    exercises: [ex('hip-thrust', 4, '8-10', 120), ex('rdl', 3, '8-10', 120), ex('split-squat', 3, '10', 90), ex('leg-curl', 3, '12', 60), ex('glute-bridge', 2, '15', 45)],
  },
  {
    id: 'full-body', name: 'Full Body Strength', subtitle: 'Squat • Push • Pull • Core', category: 'Full Body',
    exercises: [ex('goblet-squat', 3, '10', 90), ex('db-bench-press', 3, '10', 90), ex('db-row', 3, '10', 90), ex('rdl', 3, '10', 90), ex('plank', 3, '40', 45)],
  },
  {
    id: 'home-bodyweight', name: 'Home Bodyweight', subtitle: 'No equipment • 25 min', category: 'Full Body',
    exercises: [ex('bodyweight-squat', 3, '15', 45), ex('push-up', 3, '8-12', 60), ex('glute-bridge', 3, '15', 45), ex('dead-bug', 3, '10', 45), ex('side-plank', 2, '30', 30), ex('burpee', 2, '8', 60)],
  },
  {
    id: 'core-stability', name: 'Core Stability', subtitle: 'Strong, steady midline', category: 'Full Body',
    exercises: [ex('dead-bug', 3, '10', 45), ex('bird-dog', 3, '10', 45), ex('plank', 3, '45', 45), ex('side-plank', 2, '30', 30), ex('hanging-knee-raise', 3, '10', 60)],
  },
  {
    id: 'mobility-flow', name: 'Mobility Flow', subtitle: 'Loosen up • 15 min', category: 'Recovery',
    exercises: [ex('cat-cow', 2, '10', 15), ex('worlds-greatest', 2, '6', 15), ex('thoracic-rotation', 2, '8', 15), ex('hip-flexor-stretch', 2, '45', 15), ex('hamstring-stretch', 2, '45', 15), ex('childs-pose', 1, '60', 0)],
  },
  {
    id: 'active-recovery', name: 'Active Recovery', subtitle: 'Easy movement • Feel better', category: 'Recovery',
    exercises: [ex('brisk-walk', 1, '900', 0), ex('foam-roll', 1, '300', 30), ex('cat-cow', 2, '10', 15), ex('childs-pose', 1, '60', 0)],
  },
];

export const CATEGORIES = ['For You', 'Upper', 'Lower', 'Full Body', 'Recovery', 'Custom'] as const;
export type CategoryFilter = (typeof CATEGORIES)[number];
