import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, HardDrive, HeartHandshake, KeyRound, Share, Smartphone, SquarePlus, Trash2, Upload, Wifi } from 'lucide-react';
import { saveSettings } from '../db';
import { Page } from '../components/Page';
import { Logo, Wordmark } from '../components/Logo';
import { Button, Card, ListGroup, ListRow, Segmented, Skeleton, Stepper, TextInput, Toggle, cn } from '../components/ui';
import { useFeedback } from '../state/feedback';
import { useSettings } from '../state/hooks';
import { MODELS, testApiKey } from '../lib/claude';
import { exportBackup, importBackup, resetAll } from '../lib/backup';
import { errorMessage, isStandalone } from '../lib/util';
import type { Settings } from '../types';

export function SettingsPage() {
  const settings = useSettings();
  const { toast, confirm } = useFeedback();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (settings && !loaded.current) {
      loaded.current = true;
      setName(settings.name);
      setKey(settings.apiKey);
    }
  }, [settings]);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  if (!settings) return <Page title="Settings"><div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div></Page>;

  const set = async (patch: Partial<Settings>) => {
    try {
      await saveSettings(patch);
    } catch (e) {
      toast({ title: "Couldn't save setting", description: errorMessage(e), kind: 'error' });
    }
  };

  const saveKey = async () => {
    const k = key.trim();
    if (k === settings.apiKey) return;
    await set({ apiKey: k });
    toast({ title: k ? 'API key saved on this device' : 'API key removed', kind: 'info' });
  };

  const test = async () => {
    await saveKey();
    setTesting(true);
    try {
      await testApiKey(key.trim());
      toast({ title: 'Connected to Claude', description: 'Photo analysis is ready to use.' });
    } catch (e) {
      toast({ title: 'Key check failed', description: errorMessage(e), kind: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const doExport = async () => {
    try {
      const r = await exportBackup();
      if (r !== 'cancelled') toast({ title: 'Backup ready', description: r === 'shared' ? 'Save it to Files or iCloud Drive.' : 'Check your downloads.' });
    } catch (e) {
      toast({ title: 'Export failed', description: errorMessage(e), kind: 'error' });
    }
  };

  const doImport = async (file?: File) => {
    if (!file) return;
    if (!(await confirm({ title: 'Restore this backup?', message: 'This replaces all data currently in the app.', confirmText: 'Restore backup', danger: true }))) return;
    try {
      const n = await importBackup(file);
      toast({ title: 'Backup restored', description: `${n} records imported.` });
    } catch (e) {
      toast({ title: 'Import failed', description: errorMessage(e), kind: 'error' });
    }
  };

  const doReset = async () => {
    if (!(await confirm({ title: 'Erase all data?', message: 'Workouts, meals, badges and settings will be deleted from this device. Export a backup first if you want to keep them.', confirmText: 'Erase everything', danger: true }))) return;
    if (!(await confirm({ title: 'Are you sure?', message: 'This cannot be undone.', confirmText: 'Yes, erase', danger: true }))) return;
    try {
      await resetAll();
      toast({ title: 'All data erased', kind: 'info' });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast({ title: 'Reset failed', description: errorMessage(e), kind: 'error' });
    }
  };

  const installed = isStandalone();

  return (
    <Page title="Settings">
      <Group title="Profile">
        <Row label="Your name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} onBlur={() => set({ name: name.trim() })} placeholder="Demon" className="h-10 w-40 py-0 text-right" maxLength={24} />
        </Row>
        <Row label="Weight unit">
          <Segmented className="w-36" options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={settings.weightUnit} onChange={(v) => set({ weightUnit: v })} />
        </Row>
      </Group>

      <Group title="Training">
        <Row label="Weekly workout target" hint="A gentle aim. Rest days matter too.">
          <Stepper label="weekly target" value={settings.weeklyTarget} min={1} max={7} onChange={(v) => set({ weeklyTarget: v })} />
        </Row>
        <Row label="Default rest time">
          <Stepper label="rest time" value={settings.defaultRest} min={15} max={300} step={15} format={(v) => `${v}s`} onChange={(v) => set({ defaultRest: v })} />
        </Row>
        <Row label="Rest timer sound">
          <Toggle label="Rest timer sound" checked={settings.sound} onChange={(v) => set({ sound: v })} />
        </Row>
      </Group>

      <Group title="Nutrition & hydration">
        <Row label="Show calories" hint="Turn off to focus on balance and food groups without numbers.">
          <Toggle label="Show calories" checked={settings.showCalories} onChange={(v) => set({ showCalories: v })} />
        </Row>
        <Row label="Daily water goal">
          <Stepper label="water goal" value={settings.waterGoal} min={1000} max={5000} step={250} format={(v) => `${(v / 1000).toFixed(2)} L`} onChange={(v) => set({ waterGoal: v })} />
        </Row>
        <Row label="Quick-add amount">
          <Segmented className="w-48" options={[{ value: '150', label: '150' }, { value: '250', label: '250' }, { value: '500', label: '500' }]} value={String(settings.waterStep)} onChange={(v) => set({ waterStep: Number(v) })} />
        </Row>
      </Group>

      <Group title="Claude photo analysis" footer="Optional. Your key is stored only on this device and is never included in backups. Get one at platform.claude.com (billed separately from a Claude subscription).">
        <div className="space-y-3 p-4">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
            <TextInput
              type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} onBlur={saveKey}
              placeholder="sk-ant-…" autoComplete="off" autoCapitalize="off" spellCheck={false} className="pl-10 pr-12 font-mono text-[14px]"
            />
            <button type="button" aria-label={showKey ? 'Hide key' : 'Show key'} onClick={() => setShowKey((v) => !v)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-white/50">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="space-y-1.5">
            {MODELS.map((m) => (
              <button
                key={m.id} type="button" onClick={() => set({ model: m.id })}
                className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition', settings.model === m.id ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/[0.06] bg-white/[0.03]')}
              >
                <span>
                  <span className="block text-[15px] font-semibold">{m.label}</span>
                  <span className="text-[12px] text-white/45">{m.note}</span>
                </span>
                {settings.model === m.id && <CheckCircle2 className="h-5 w-5 text-violet-300" />}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" full size="sm" loading={testing} disabled={!key.trim()} onClick={test}>Test connection</Button>
            {settings.apiKey && <Button variant="danger" size="sm" onClick={() => { setKey(''); void set({ apiKey: '' }); toast({ title: 'API key removed', kind: 'info' }); }}>Remove</Button>}
          </div>
        </div>
      </Group>

      <Group title="App">
        {installed ? (
          <ListRow icon={Smartphone} iconColor="#4ade80" title="Installed on Home Screen" subtitle="Works offline and opens full screen" />
        ) : (
          <div className="p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><Smartphone className="h-5 w-5 text-violet-300" /> Install on your iPhone</p>
            <ol className="mt-2 space-y-1.5 text-[14px] text-white/65">
              <li className="flex items-center gap-2">1. Open this page in <b>Safari</b></li>
              <li className="flex items-center gap-2">2. Tap <Share className="h-4 w-4 text-sky-400" /> <b>Share</b></li>
              <li className="flex items-center gap-2">3. Tap <SquarePlus className="h-4 w-4" /> <b>Add to Home Screen</b></li>
            </ol>
          </div>
        )}
        <ListRow icon={HardDrive} iconColor="#60a5fa" title="Storage" subtitle={persisted ? 'Protected from automatic clean-up' : 'Saved on this device. Export backups regularly.'} />
        <ListRow icon={Wifi} iconColor="#a78bfa" title="Offline mode" subtitle="Workouts, journal and progress work without internet" />
      </Group>

      <Group title="Your data">
        <ListRow icon={Download} iconColor="#4ade80" title="Export backup" subtitle="Save a copy to Files or iCloud Drive" onClick={doExport} />
        <ListRow icon={Upload} iconColor="#60a5fa" title="Restore from backup" subtitle="Import a CalDemon backup file" onClick={() => fileRef.current?.click()} />
        <ListRow icon={Trash2} iconColor="#fb7185" title="Erase all data" danger onClick={doReset} />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }} />
      </Group>

      <Card className="mt-6 p-5 text-center">
        <div className="flex justify-center"><Logo size={56} glow /></div>
        <p className="mt-2 text-[20px]"><Wordmark /></p>
        <p className="text-[13px] text-white/40">Version 1.0 • Train. Fuel. Recover.</p>
        <p className="mt-4 flex items-start gap-2 text-left text-[12px] leading-snug text-white/45">
          <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
          CalDemon supports general wellbeing and is not medical advice. Nutrition estimates are approximate. If food or exercise ever feels stressful, talking to a doctor or registered dietitian can really help.
        </p>
      </Card>
    </Page>
  );
}

function Group({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-white/40">{title}</p>
      <ListGroup>{children}</ListGroup>
      {footer && <p className="mt-2 px-1 text-[12px] leading-snug text-white/35">{footer}</p>}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[16px]">{label}</p>
        {hint && <p className="text-[12px] leading-snug text-white/40">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
