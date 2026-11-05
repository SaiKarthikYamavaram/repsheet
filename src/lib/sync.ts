import { useSyncExternalStore } from 'react';

import { FORM_URL, SHEET_ID } from '@/config';

import { getKv, outboxCount, outboxRemove, outboxRows, setKv } from './db';
import { buildRoutine, encodeForm, formEntries, formResponseUrl, Routine } from './logic';
import { STARTER } from './starter';

type Cached = { routine: Routine; fetchedAt: number };
export type SyncState = {
  routine: Routine;
  fetchedAt: number | null;
  syncing: boolean;
  sheetError: string | null;
  waiting: number;
  backupError: string | null;
};

function loadCached(): Cached | null {
  try {
    const raw = getKv('routine');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const cached = loadCached();
let state: SyncState = {
  routine: cached?.routine ?? buildRoutine(STARTER),
  fetchedAt: cached?.fetchedAt ?? null,
  syncing: false,
  sheetError: null,
  waiting: outboxCount(),
  backupError: null,
};
const listeners = new Set<() => void>();

function update(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSync(): SyncState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
export const getRoutine = () => state.routine;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTab(tab: string): Promise<string> {
  const res = await fetchWithTimeout(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${tab}`);
  const text = await res.text();
  // Google answers a private sheet with an HTML sign-in page.
  if (!res.ok || text.trimStart().startsWith('<')) {
    throw new Error(`Couldn't read the ${tab} tab. Check that the sheet is shared with anyone who has the link.`);
  }
  return text;
}

// A bad edit or no signal keeps the last good routine, so the app always has a workout to show.
export async function refreshRoutine() {
  if (!SHEET_ID || state.syncing) return;
  update({ syncing: true });
  try {
    const [exercises, routine, settings] = await Promise.all([fetchTab('exercises'), fetchTab('routine'), fetchTab('settings').catch(() => undefined)]);
    const built = buildRoutine({ exercises, routine, settings });
    const fetchedAt = Date.now();
    setKv('routine', JSON.stringify({ routine: built, fetchedAt }));
    update({ routine: built, fetchedAt, syncing: false, sheetError: null });
  } catch (e) {
    const offline = e instanceof TypeError || (e as Error).name === 'AbortError';
    update({ syncing: false, sheetError: offline ? null : (e as Error).message });
  }
}

let flushing = false;

async function entryIds(): Promise<Record<string, string>> {
  const key = `form:${FORM_URL}`;
  const cachedIds = getKv(key);
  if (cachedIds) return JSON.parse(cachedIds);
  const res = await fetchWithTimeout(FORM_URL);
  const ids = formEntries(await res.text());
  setKv(key, JSON.stringify(ids));
  return ids;
}

// Sends queued rows in order and stops at the first failure, so nothing is lost or skipped.
export async function flushOutbox() {
  update({ waiting: outboxCount() });
  if (!FORM_URL || flushing) return;
  flushing = true;
  try {
    const rows = outboxRows();
    if (rows.length) {
      const ids = await entryIds();
      for (const row of rows) {
        const payload: Record<string, string> = JSON.parse(row.payload);
        const fields: Record<string, string> = {};
        for (const [question, value] of Object.entries(payload)) {
          if (!ids[question]) throw new Error(`Your form has no "${question}" question.`);
          fields[`entry.${ids[question]}`] = value;
        }
        const res = await fetchWithTimeout(formResponseUrl(FORM_URL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encodeForm(fields),
        });
        if (!res.ok) throw new Error(`Your form refused a backup (error ${res.status}). Check that it doesn't require sign-in.`);
        outboxRemove(row.id);
        update({ waiting: outboxCount() });
      }
    }
    update({ backupError: null });
  } catch (e) {
    const offline = e instanceof TypeError || (e as Error).name === 'AbortError';
    update({ backupError: offline ? null : (e as Error).message });
  } finally {
    flushing = false;
    update({ waiting: outboxCount() });
  }
}

export function syncAll() {
  refreshRoutine();
  flushOutbox();
}
