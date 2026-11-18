import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight, Clock, Dumbbell, History, Layers, Leaf, Play, Plus, Sparkles, Zap } from 'lucide-react';
import { db } from '../db';
import { Button, Card, Chips, EmptyState, IconButton, ScreenHeader, SectionTitle, Skeleton } from '../components/ui';
import { useNav } from '../state/nav';
import { useActiveSession, useDoneSessions, useExercises, useTemplates, useToday } from '../state/hooks';
import { useStartWorkout } from '../lib/actions';
import { estimateMinutes, recommend } from '../lib/stats';
import { CATEGORIES, type CategoryFilter } from '../data/workouts';
import type { WorkoutCategory, WorkoutTemplate } from '../types';

export const CATEGORY_STYLE: Record<WorkoutCategory, { color: string; icon: typeof Dumbbell }> = {
  Upper: { color: '#a78bfa', icon: Dumbbell },
  Lower: { color: '#f472b6', icon: Zap },
  'Full Body': { color: '#60a5fa', icon: Layers },
  Recovery: { color: '#2dd4bf', icon: Leaf },
};

export function WorkoutsScreen() {
  const { push } = useNav();
  const today = useToday();
  const [filter, setFilter] = useState<CategoryFilter>('For You');
  const { list, loading } = useTemplates();
  const { map: exMap } = useExercises();
  const sessions = useDoneSessions();
  const active = useActiveSession();
  const checkin = useLiveQuery(() => db.checkins.get(today), [today]);
  const startWorkout = useStartWorkout();

  const shown = useMemo(() => {
    if (filter === 'For You') return recommend(list, sessions ?? [], checkin);
    if (filter === 'Custom') return list.filter((t) => t.custom);
    return list.filter((t) => t.category === filter);
  }, [filter, list, sessions, checkin]);

  const [featured, ...rest] = shown;

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Workouts"
        right={
          <>
            <IconButton icon={History} label="Workout history" onClick={() => push({ name: 'history' })} />
            <IconButton icon={Plus} label="Create workout" tone="accent" onClick={() => push({ name: 'editor' })} />
          </>
        }
      />
      <div className="px-5">
        <Chips options={CATEGORIES} value={filter} onChange={setFilter} className="mb-4" />

        {active && (
          <Card onClick={() => push({ name: 'session', id: active.id })} className="mb-3 border-violet-500/30 bg-violet-500/15 p-4" label="Resume workout">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 fill-violet-300 text-violet-300" />
              <p className="flex-1 truncate font-semibold">Resume {active.name}</p>
              <ChevronRight className="h-5 w-5 text-white/40" />
            </div>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3"><Skeleton className="h-56" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        ) : !featured ? (
          <EmptyState
            icon={Sparkles}
            title="No custom workouts yet"
            text="Build a routine around the exercises you love."
            action={<Button icon={Plus} onClick={() => push({ name: 'editor' })}>Create workout</Button>}
          />
        ) : (
          <div key={filter} className="animate-tab">
            <FeaturedCard t={featured} minutes={estimateMinutes(featured, exMap)} onOpen={() => push({ name: 'workout', id: featured.id })} onStart={() => void startWorkout(featured)} forYou={filter === 'For You'} />
            {rest.length > 0 && <SectionTitle title={filter === 'For You' ? 'Also great today' : 'More workouts'} />}
            <div className="space-y-2.5">
              {rest.map((t) => (
                <TemplateRow key={t.id} t={t} minutes={estimateMinutes(t, exMap)} onClick={() => push({ name: 'workout', id: t.id })} />
              ))}
            </div>
          </div>
        )}

        <SectionTitle title="Explore" />
        <div className="grid grid-cols-2 gap-3">
          <Card onClick={() => push({ name: 'library' })} className="p-4" label="Exercise library">
            <BookOpen className="h-6 w-6 text-violet-300" />
            <p className="mt-3 font-semibold">Exercise library</p>
            <p className="text-[13px] text-white/45">{exMap.size} exercises</p>
          </Card>
          <Card onClick={() => push({ name: 'history' })} className="p-4" label="History">
            <History className="h-6 w-6 text-violet-300" />
            <p className="mt-3 font-semibold">History</p>
            <p className="text-[13px] text-white/45">{sessions?.length ?? 0} workouts logged</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ t, minutes, onOpen, onStart, forYou }: { t: WorkoutTemplate; minutes: number; onOpen: () => void; onStart: () => void; forYou: boolean }) {
  const st = CATEGORY_STYLE[t.category];
  const Icon = st.icon;
  return (
    <Card className="p-0">
      <button type="button" onClick={onOpen} className="block w-full text-left active:opacity-80" aria-label={`Open ${t.name}`}>
        <div className="relative h-40 overflow-hidden" style={{ background: `radial-gradient(120% 90% at 80% 10%, ${st.color}55 0%, #1b1530 45%, #110f1a 100%)` }}>
          <Icon className="absolute -right-4 top-2 h-44 w-44 -rotate-12" style={{ color: `${st.color}22` }} strokeWidth={1.2} />
          <div className="absolute inset-0 bg-linear-to-t from-ink-800 via-transparent to-transparent" />
          {forYou && (
            <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[12px] font-semibold text-violet-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Recommended
            </span>
          )}
          <div className="absolute bottom-3 left-5 right-5">
            <p className="text-[26px] font-bold tracking-tight">{t.name}</p>
            <p className="text-[14px] text-white/65">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-4 px-5 pt-3 text-[13px] text-white/55">
          <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" />{t.exercises.length} exercises</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />~{minutes} min</span>
        </div>
      </button>
      <div className="p-4 pt-3">
        <Button full size="lg" icon={Play} onClick={onStart}>Start Workout</Button>
      </div>
    </Card>
  );
}

export function TemplateRow({ t, minutes, onClick }: { t: WorkoutTemplate; minutes: number; onClick: () => void }) {
  const st = CATEGORY_STYLE[t.category];
  const Icon = st.icon;
  return (
    <Card onClick={onClick} className="p-3.5" label={t.name}>
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${st.color}1f`, color: st.color }}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{t.name}</p>
          <p className="truncate text-[13px] text-white/45">{t.subtitle || t.category} • {t.exercises.length} ex • ~{minutes} min</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
      </div>
    </Card>
  );
}
