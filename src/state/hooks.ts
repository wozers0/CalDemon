import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../db';
import { BUILT_IN_EXERCISES } from '../data/exercises';
import { BUILT_IN_WORKOUTS } from '../data/workouts';
import type { Exercise, Settings, WorkoutTemplate } from '../types';
import { dateKey } from '../lib/util';

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const row = await db.kv.get('settings');
    return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
  });
}

/** Today's date key; updates after midnight. */
export function useToday(): string {
  const [key, setKey] = useState(dateKey());
  useEffect(() => {
    const id = setInterval(() => setKey(dateKey()), 30000);
    const onVis = () => document.visibilityState === 'visible' && setKey(dateKey());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return key;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useExercises() {
  const custom = useLiveQuery(() => db.exercises.toArray());
  return useMemo(() => {
    const list: Exercise[] = [...BUILT_IN_EXERCISES, ...(custom ?? [])];
    return { list, map: new Map(list.map((e) => [e.id, e])), loading: custom === undefined };
  }, [custom]);
}

export function useTemplates() {
  const custom = useLiveQuery(() => db.workouts.orderBy('createdAt').reverse().toArray());
  return useMemo(() => {
    const list: WorkoutTemplate[] = [...(custom ?? []), ...BUILT_IN_WORKOUTS];
    return { list, custom: custom ?? [], map: new Map(list.map((t) => [t.id, t])), loading: custom === undefined };
  }, [custom]);
}

export function useDoneSessions() {
  return useLiveQuery(() => db.sessions.where('status').equals('done').reverse().sortBy('startedAt'));
}

export function useActiveSession() {
  return useLiveQuery(() => db.sessions.where('status').equals('active').first(), [], null);
}
