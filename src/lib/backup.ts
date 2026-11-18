import { ALL_TABLES, db } from '../db';
import type { Settings } from '../types';
import { dateKey } from './util';

interface BackupFile {
  app: 'caldemon';
  version: 1;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const tables: Record<string, unknown[]> = {};
  for (const name of ALL_TABLES) {
    let rows = (await db.table(name).toArray()) as unknown[];
    if (name === 'kv') {
      // never put the API key in a backup file
      rows = rows.map((r) => {
        const row = r as { key: string; value: unknown };
        return row.key === 'settings' ? { ...row, value: { ...(row.value as Settings), apiKey: '' } } : row;
      });
    }
    tables[name] = rows;
  }
  const data: BackupFile = { app: 'caldemon', version: 1, exportedAt: new Date().toISOString(), tables };
  const fileName = `caldemon-backup-${dateKey()}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'CalDemon backup' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

export async function importBackup(file: File): Promise<number> {
  let data: BackupFile;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not a valid CalDemon backup.');
  }
  if (data?.app !== 'caldemon' || !data.tables) throw new Error('That file is not a CalDemon backup.');
  const currentKey = ((await db.kv.get('settings'))?.value as Settings | undefined)?.apiKey ?? '';
  let count = 0;
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const name of ALL_TABLES) {
      const rows = data.tables[name];
      if (!Array.isArray(rows)) continue;
      await db.table(name).clear();
      if (name === 'kv') {
        const fixed = rows.map((r) => {
          const row = r as { key: string; value: Settings };
          return row.key === 'settings' ? { ...row, value: { ...row.value, apiKey: row.value?.apiKey || currentKey } } : row;
        });
        await db.table(name).bulkPut(fixed);
      } else {
        await db.table(name).bulkPut(rows);
      }
      count += rows.length;
    }
  });
  return count;
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const name of ALL_TABLES) await db.table(name).clear();
  });
}
