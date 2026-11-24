import { Observe } from 'expo-observe';
import { useSyncExternalStore } from 'react';

import { FORM_URL, SHEET_ID } from '@/config';

import { getKv, outboxCount, outboxRemove, outboxRows, setKv } from './db';
import { buildRoutine, DEFAULT_BAR_KG, DEFAULT_PLATES, encodeForm, formEntries, formResponseUrl, Routine } from './logic';
import { STARTER } from './starter';

// Until the sheet has a warmup tab, use the program's warm-ups for days named Push, Pull and Legs.
const starterPrep = buildRoutine(STARTER).prep;
const withPrep = (r: Routine): Routine => (r.prep?.length ? r : { ...r, prep: starterPrep });

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
    if (!raw) return null;
    const parsed: Cached = JSON.parse(raw);
    // A routine cached by an older version has no plate settings yet.
    return { ...parsed, routine: withPrep({ ...parsed.routine, barKg: parsed.routine.barKg ?? DEFAULT_BAR_KG, plates: parsed.routine.plates ?? DEFAULT_PLATES, minVersion: parsed.routine.minVersion ?? '', updateUrl: parsed.routine.updateUrl ?? '' }) };
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
    const optional = (tab: string) => fetchTab(tab).catch(() => undefined);
    const [exercises, routine, settings, app, warmup] = await Promise.all([fetchTab('exercises'), fetchTab('routine'), optional('settings'), optional('app'), optional('warmup')]);
    const built = withPrep(buildRoutine({ exercises, routine, settings, app, warmup }));
    const fetchedAt = Date.now();
    setKv('routine', JSON.stringify({ routine: built, fetchedAt }));
    update({ routine: built, fetchedAt, syncing: false, sheetError: null });
  } catch (e) {
    const offline = e instanceof TypeError || (e as Error).name === 'AbortError';
    if (!offline) Observe.reportError(e);
    update({ syncing: false, sheetError: offline ? null : (e as Error).message });
  }
}

// Android keeps the app alive in the background, so coming back to it also picks up sheet edits.
// Waits 10 minutes between reads, because the phone wakes the app between every set.
export function refreshIfStale() {
  if (Date.now() - (state.fetchedAt ?? 0) > 10 * 60_000) refreshRoutine();
}

let flushing = false;

async function entryIds(fresh = false): Promise<Record<string, string>> {
  const key = `form:${FORM_URL}`;
  const cachedIds = fresh ? null : getKv(key);
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
      let ids = await entryIds();
      for (const row of rows) {
        // Added at send time, so sets logged before you enter your name still get labelled.
        const payload: Record<string, string> = { ...JSON.parse(row.payload), person: getPerson() };
        // A question added to the form after the first backup isn't in the saved IDs yet.
        if (Object.keys(payload).some((q) => !ids[q])) ids = await entryIds(true);
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
    if (!offline) Observe.reportError(e);
    update({ backupError: offline ? null : (e as Error).message });
  } finally {
    flushing = false;
    update({ waiting: outboxCount() });
  }
}

export const getPerson = () => getKv('person') ?? '';

export function setPerson(name: string) {
  setKv('person', name.trim().slice(0, 40));
}

export function syncAll() {
  refreshRoutine();
  flushOutbox();
}
