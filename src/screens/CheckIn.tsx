import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Button, ScalePicker, Toggle } from '../components/ui';
import { db } from '../db';
import { useFeedback } from '../state/feedback';
import type { CheckIn } from '../types';
import { errorMessage } from '../lib/util';

const ENERGY = [
  { emoji: '🪫', label: 'Drained' }, { emoji: '😮‍💨', label: 'Low' }, { emoji: '🙂', label: 'Okay' }, { emoji: '⚡', label: 'Good' }, { emoji: '🔥', label: 'Great' },
];
const SLEEP = [
  { emoji: '😵', label: 'Awful' }, { emoji: '🥱', label: 'Poor' }, { emoji: '😌', label: 'Fair' }, { emoji: '😴', label: 'Good' }, { emoji: '🌙', label: 'Great' },
];
const SORE = [
  { emoji: '✨', label: 'None' }, { emoji: '🙂', label: 'Light' }, { emoji: '😐', label: 'Some' }, { emoji: '😣', label: 'Sore' }, { emoji: '🥵', label: 'Very' },
];
const MOOD = [
  { emoji: '🌧️', label: 'Down' }, { emoji: '😕', label: 'Meh' }, { emoji: '🙂', label: 'Fine' }, { emoji: '😄', label: 'Good' }, { emoji: '🤩', label: 'Amazing' },
];

export function CheckInSheet({ open, onClose, date, existing }: { open: boolean; onClose: () => void; date: string; existing?: CheckIn }) {
  const { toast } = useFeedback();
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [mood, setMood] = useState(3);
  const [restDay, setRestDay] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnergy(existing?.energy ?? 3);
    setSleep(existing?.sleep ?? 3);
    setSoreness(existing?.soreness ?? 2);
    setMood(existing?.mood ?? 3);
    setRestDay(existing?.restDay ?? false);
  }, [open, existing]);

  const save = async () => {
    setSaving(true);
    try {
      await db.checkins.put({ date, energy, sleep, soreness, mood, restDay, createdAt: existing?.createdAt ?? Date.now() });
      toast({ title: 'Check-in saved', description: restDay ? 'Enjoy your rest day. Recovery is progress.' : 'Thanks for listening to your body.' });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't save check-in", description: errorMessage(e), kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Daily check-in" footer={<Button full size="lg" loading={saving} onClick={save}>Save check-in</Button>}>
      <p className="mb-5 text-[15px] text-white/55">There are no wrong answers. This just helps tailor today's suggestion.</p>
      <div className="space-y-5">
        <Q label="Energy"><ScalePicker label="Energy" value={energy} onChange={setEnergy} options={ENERGY} /></Q>
        <Q label="Last night's sleep"><ScalePicker label="Sleep" value={sleep} onChange={setSleep} options={SLEEP} /></Q>
        <Q label="Muscle soreness"><ScalePicker label="Soreness" value={soreness} onChange={setSoreness} options={SORE} /></Q>
        <Q label="Mood"><ScalePicker label="Mood" value={mood} onChange={setMood} options={MOOD} /></Q>
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3.5">
          <div>
            <p className="text-[16px] font-medium">Planned rest day</p>
            <p className="text-[13px] text-white/45">Rest days still count toward your streak.</p>
          </div>
          <Toggle label="Planned rest day" checked={restDay} onChange={setRestDay} />
        </div>
      </div>
    </Sheet>
  );
}

function Q({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[15px] font-semibold">{label}</p>
      {children}
    </div>
  );
}
