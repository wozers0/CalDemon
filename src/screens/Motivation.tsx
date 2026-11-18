import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Flame, Lightbulb, Plus, Share2, Shuffle, Sparkles, Star, Trash2, Wind } from 'lucide-react';
import { db, saveSettings } from '../db';
import { Page } from '../components/Page';
import { Button, Card, IconButton, ScreenHeader, SectionTitle, TextInput, cn } from '../components/ui';
import { AFFIRMATIONS, QUOTES, TIPS, dailyIndex } from '../data/motivation';
import { useNav } from '../state/nav';
import { useFeedback } from '../state/feedback';
import { useSettings, useToday } from '../state/hooks';
import { activeDays, currentStreak } from '../lib/stats';
import { copyText, fmtDay, uid } from '../lib/util';
import { Mountains } from './Home';

export function MotivationScreen() {
  const today = useToday();
  const settings = useSettings();
  const { push } = useNav();
  const { toast, confirm } = useFeedback();
  const [offset, setOffset] = useState(0);
  const [showFavs, setShowFavs] = useState(false);
  const [win, setWin] = useState('');
  const base = dailyIndex(QUOTES.length, today);
  const qi = (base + offset) % QUOTES.length;
  const quote = QUOTES[qi];
  const favs = settings?.favoriteQuotes ?? [];
  const isFav = favs.includes(qi);
  const tip = TIPS[dailyIndex(TIPS.length, today, 7)];
  const affirmation = AFFIRMATIONS[dailyIndex(AFFIRMATIONS.length, today, 3)];
  const wins = useLiveQuery(() => db.wins.orderBy('createdAt').reverse().limit(20).toArray());
  const streak = useLiveQuery(async () => {
    const [sessions, meals, water, checkins] = await Promise.all([db.sessions.where('status').equals('done').toArray(), db.meals.toArray(), db.water.toArray(), db.checkins.toArray()]);
    const days = activeDays({ sessions, meals, water, checkins });
    return { n: currentStreak(days), today: days.has(today) };
  }, [today]);

  const toggleFav = async () => {
    const next = isFav ? favs.filter((x) => x !== qi) : [...favs, qi];
    await saveSettings({ favoriteQuotes: next });
    toast({ title: isFav ? 'Removed from favourites' : 'Saved to favourites', kind: 'info', duration: 1500 });
  };

  const share = async () => {
    const text = `“${quote}” — CalDemon`;
    try {
      if (navigator.share) await navigator.share({ text });
      else if (await copyText(text)) toast({ title: 'Quote copied' });
    } catch {
      /* cancelled */
    }
  };

  const addWin = async () => {
    const text = win.trim();
    if (!text) return;
    await db.wins.add({ id: uid(), date: today, text, createdAt: Date.now() });
    setWin('');
    toast({ title: 'Win recorded ✨', description: 'Celebrate every step.' });
  };

  return (
    <div className="pb-6">
      <ScreenHeader title="Motivation" right={<IconButton icon={Star} label={showFavs ? 'Hide favourites' : 'Show favourites'} tone={showFavs ? 'accent' : 'default'} onClick={() => setShowFavs((v) => !v)} />} />
      <div className="px-5">
        {showFavs ? (
          <div className="animate-tab">
            <SectionTitle title="Favourite quotes" className="mt-0" />
            {favs.length === 0 ? (
              <p className="rounded-3xl bg-ink-800 px-5 py-6 text-center text-[14px] text-white/50">Tap the star on a quote to save it here.</p>
            ) : (
              <div className="space-y-2">
                {favs.map((i) => (
                  <Card key={i} className="flex items-center gap-3 p-4">
                    <p className="flex-1 text-[15px] font-medium leading-snug">“{QUOTES[i]}”</p>
                    <IconButton icon={Trash2} label="Remove favourite" tone="plain" onClick={() => saveSettings({ favoriteQuotes: favs.filter((x) => x !== i) })} />
                  </Card>
                ))}
              </div>
            )}
            <Button variant="secondary" full className="mt-4" onClick={() => setShowFavs(false)}>Back to today</Button>
          </div>
        ) : (
          <div className="animate-tab">
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[radial-gradient(120%_100%_at_100%_0%,#3b1d6e_0%,#1a1129_45%,#110f1a_100%)] p-6 pb-5">
              <Mountains className="!h-44 !w-56 opacity-100" />
              <div key={qi} className="animate-rise relative pr-10">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-violet-300/80">{offset === 0 ? "Today's reminder" : 'Another one'}</p>
                <p className="mt-2 text-[28px] font-bold leading-[1.15] tracking-tight">{quote}</p>
                <p className="mt-3 text-[15px] font-semibold text-violet-300">Keep going, {settings?.name?.trim() || 'Demon'}.</p>
              </div>
              <div className="relative mt-6 flex gap-2">
                <IconButton icon={Shuffle} label="Another quote" onClick={() => setOffset((o) => o + 1 + Math.floor(Math.random() * 5))} />
                <IconButton icon={Star} label={isFav ? 'Remove from favourites' : 'Save to favourites'} tone={isFav ? 'accent' : 'default'} onClick={toggleFav} className={cn(isFav && '[&_svg]:fill-violet-300')} />
                <IconButton icon={Share2} label="Share quote" onClick={share} />
              </div>
            </div>

            <Card className="mt-3 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-[26px]">🔥</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white/50">Show-up streak</p>
                  <p className="text-[22px] font-bold">{streak?.n ?? 0} {streak?.n === 1 ? 'day' : 'days'}</p>
                  <p className="text-[13px] leading-snug text-white/45">
                    {streak?.today ? 'You showed up today. Proud of you!' : 'Any check-in, meal, water or workout counts. Rest days too.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="mt-3 p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="h-5 w-5 text-violet-300" /> Daily affirmation</p>
              <p className="mt-2 text-[17px] font-medium italic leading-snug text-white/85">{affirmation}</p>
            </Card>

            <Card className="mt-3 p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><Lightbulb className="h-5 w-5 text-amber-300" /> Daily tip</p>
              <p className="mt-2 text-[15px] leading-snug text-white/70">{tip}</p>
            </Card>

            <Card onClick={() => push({ name: 'breathe' })} className="mt-3 p-4" label="Breathing exercise">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-300"><Wind className="h-6 w-6" /></span>
                <div className="flex-1">
                  <p className="text-[16px] font-semibold">One-minute reset</p>
                  <p className="text-[13px] text-white/45">Box breathing to calm your mind and aid recovery</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/40" />
              </div>
            </Card>

            <SectionTitle title="Wins journal" />
            <Card className="p-3">
              <div className="flex gap-2">
                <TextInput value={win} onChange={(e) => setWin(e.target.value)} placeholder="Something you're proud of today" onKeyDown={(e) => e.key === 'Enter' && addWin()} enterKeyHint="done" maxLength={140} />
                <Button icon={Plus} onClick={addWin} disabled={!win.trim()} aria-label="Add win" className="shrink-0 px-4" />
              </div>
              {wins && wins.length > 0 ? (
                <div className="mt-2 divide-y divide-white/[0.05]">
                  {wins.map((w) => (
                    <div key={w.id} className="flex items-start gap-3 py-2.5">
                      <Flame className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-snug">{w.text}</p>
                        <p className="text-[12px] text-white/35">{fmtDay(w.date)}</p>
                      </div>
                      <button type="button" aria-label="Delete win" onClick={async () => { if (await confirm({ title: 'Delete this win?', confirmText: 'Delete', danger: true })) await db.wins.delete(w.id); }} className="grid h-7 w-7 place-items-center rounded-full text-white/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-1 pb-1 pt-3 text-[13px] leading-snug text-white/40">Big or small, every win counts: an extra rep, a good night's sleep, a glass of water.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

const PHASES = [
  { label: 'Breathe in', scale: 1 },
  { label: 'Hold', scale: 1 },
  { label: 'Breathe out', scale: 0.55 },
  { label: 'Hold', scale: 0.55 },
];

export function BreathePage() {
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (t >= 64) setRunning(false);
  }, [t]);

  const done = t >= 64;
  const phase = Math.floor(t / 4) % 4;
  const count = 4 - (t % 4);
  const p = PHASES[phase];
  const scale = running ? p.scale : 0.7;
  const duration = phase === 0 || phase === 2 ? 4 : 0.3;

  return (
    <Page title="Breathe">
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="relative grid h-72 w-72 place-items-center">
          <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-3xl" />
          <div
            className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4b5fd,#7c3aed_55%,#4c1d95)] shadow-[0_0_60px_rgba(139,92,246,.5)]"
            style={{ transform: `scale(${scale})`, transition: `transform ${running ? duration : 0.6}s ease-in-out` }}
          />
          <div className="relative">
            <p className="text-[22px] font-bold">{done ? 'Well done' : running ? p.label : 'Ready?'}</p>
            {running && <p className="tabular text-[40px] font-bold leading-none">{count}</p>}
          </div>
        </div>
        <p className="mt-6 max-w-[280px] text-[15px] leading-snug text-white/55">
          {done ? 'Notice how you feel. You can repeat anytime.' : 'In for 4, hold for 4, out for 4, hold for 4. Four rounds, about a minute.'}
        </p>
        <Button
          size="lg" className="mt-6 min-w-[200px]"
          onClick={() => {
            if (running) setRunning(false);
            else {
              setT(0);
              setRunning(true);
            }
          }}
        >
          {running ? 'Stop' : done ? 'Go again' : 'Start'}
        </Button>
      </div>
    </Page>
  );
}
