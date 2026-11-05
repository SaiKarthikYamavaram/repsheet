// Pure rules with no React Native imports, so `bun test` can run them directly.

export type Exercise = { name: string; muscle: string; videoUrl: string; cues: string; equipment: string };
export type RoutineItem = {
  exercise: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  incrementKg: number;
  superset: string;
};
export type Day = { order: number; name: string; items: RoutineItem[] };
export type Routine = { exercises: Exercise[]; days: Day[]; weeklyTarget: number; barKg: number; plates: number[] };

export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export type Lift = { kg: number; reps: number };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

type Row = { line: number; get: (column: string) => string };

function table(csv: string, tab: string, required: string[]): Row[] {
  const [header, ...body] = parseCsv(csv);
  if (!header) throw new Error(`The ${tab} tab is empty.`);
  const columns = header.map((h) => h.trim().toLowerCase());
  for (const column of required) {
    if (!columns.includes(column)) throw new Error(`The ${tab} tab has no "${column}" column.`);
  }
  return body
    .map((cells, i) => ({
      line: i + 2,
      blank: cells.every((c) => c.trim() === ''),
      get: (column: string) => (cells[columns.indexOf(column)] ?? '').trim(),
    }))
    .filter((r) => !r.blank);
}

function number(row: Row, tab: string, column: string): number {
  const value = Number(row.get(column));
  if (row.get(column) === '' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${tab} row ${row.line}: "${column}" must be a number.`);
  }
  return value;
}

export function buildRoutine(csv: { exercises: string; routine: string; settings?: string }): Routine {
  const exercises = table(csv.exercises, 'exercises', ['name', 'muscle', 'video_url', 'cues']).map((r) => {
    if (!r.get('name')) throw new Error(`exercises row ${r.line}: "name" is empty.`);
    return { name: r.get('name'), muscle: r.get('muscle') || 'Other', videoUrl: r.get('video_url'), cues: r.get('cues'), equipment: r.get('equipment').toLowerCase() };
  });
  const known = new Set(exercises.map((e) => e.name));
  const days = new Map<number, Day>();
  const columns = ['day_order', 'day_name', 'exercise', 'sets', 'rep_min', 'rep_max', 'rest_sec', 'increment_kg'];
  for (const r of table(csv.routine, 'routine', columns)) {
    const name = r.get('exercise');
    if (!known.has(name)) throw new Error(`routine row ${r.line}: "${name}" is not in the exercises tab.`);
    const order = number(r, 'routine', 'day_order');
    const item: RoutineItem = {
      exercise: name,
      sets: number(r, 'routine', 'sets'),
      repMin: number(r, 'routine', 'rep_min'),
      repMax: number(r, 'routine', 'rep_max'),
      restSec: number(r, 'routine', 'rest_sec'),
      incrementKg: number(r, 'routine', 'increment_kg'),
      superset: r.get('superset'),
    };
    if (item.sets < 1) throw new Error(`routine row ${r.line}: "sets" must be at least 1.`);
    if (!days.has(order)) days.set(order, { order, name: r.get('day_name') || `Day ${order}`, items: [] });
    days.get(order)!.items.push(item);
  }
  if (!days.size) throw new Error('The routine tab has no workouts.');
  let weeklyTarget = 4;
  let barKg = DEFAULT_BAR_KG;
  let plates = DEFAULT_PLATES;
  if (csv.settings) {
    // Google returns the first tab when a tab doesn't exist, so a missing settings tab just means the defaults.
    const header = (parseCsv(csv.settings)[0] ?? []).map((h) => h.trim().toLowerCase());
    const rows = header.includes('key') && header.includes('value') ? table(csv.settings, 'settings', ['key', 'value']) : [];
    const target = rows.find((r) => r.get('key') === 'weekly_target');
    if (target) {
      weeklyTarget = number(target, 'settings', 'value');
      if (weeklyTarget < 1) throw new Error(`settings row ${target.line}: "weekly_target" must be at least 1.`);
    }
    const bar = rows.find((r) => r.get('key') === 'bar_kg');
    if (bar) barKg = number(bar, 'settings', 'value');
    // One row per plate size, because Google blanks text in a column of mostly numbers.
    const listed = rows.filter((r) => r.get('key') === 'plate_kg').map((r) => number(r, 'settings', 'value')).filter((n) => n > 0);
    if (listed.length) plates = listed;
  }
  return { exercises, days: [...days.values()].sort((a, b) => a.order - b.order), weeklyTarget, barKg, plates };
}

type LoggableItem = { superset?: string; sets: { doneAt: number | null }[] };

// Where to go after ticking a set. Supersets move to the next exercise in the group without rest,
// and rest once each round is complete.
export function nextAfterSet(items: LoggableItem[], position: number): { rest: boolean; position: number } {
  const open = (i: number) => items[i].sets.some((s) => !s.doneAt);
  const label = items[position].superset;
  let start = position;
  let end = position;
  if (label) {
    while (start > 0 && items[start - 1].superset === label) start--;
    while (end < items.length - 1 && items[end + 1].superset === label) end++;
  }
  for (let i = position + 1; i <= end; i++) if (open(i)) return { rest: false, position: i };
  for (let i = start; i <= end; i++) if (open(i)) return { rest: true, position: i };
  for (let i = end + 1; i < items.length; i++) if (open(i)) return { rest: true, position: i };
  for (let i = 0; i < start; i++) if (open(i)) return { rest: true, position: i };
  return { rest: false, position };
}

// Greedy works because gym plate sizes each fit evenly into the larger ones, near enough to load a real bar.
export function platesFor(totalKg: number, barKg: number, plates: number[]): { perSide: number[]; shortKg: number; belowBar: boolean } {
  if (totalKg < barKg) return { perSide: [], shortKg: 0, belowBar: true };
  // Whole grams, so 1.25 kg plates don't pick up floating point errors.
  let left = Math.round(((totalKg - barKg) / 2) * 1000);
  const perSide: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    const grams = Math.round(plate * 1000);
    while (left >= grams) {
      perSide.push(plate);
      left -= grams;
    }
  }
  return { perSide, shortKg: (left * 2) / 1000, belowBar: false };
}

export function warmupSets(workKg: number, barKg: number, stepKg: number, barbell: boolean): Lift[] {
  const steps = [{ pct: 0.4, reps: 8 }, { pct: 0.6, reps: 5 }, { pct: 0.8, reps: 3 }];
  const out: Lift[] = barbell && workKg > barKg ? [{ kg: barKg, reps: 10 }] : [];
  const floor = barbell ? barKg : 0;
  for (const { pct, reps } of steps) {
    const kg = +(Math.round((workKg * pct) / stepKg) * stepKg).toFixed(2);
    if (kg > floor && kg < workKg && !out.some((l) => l.kg === kg)) out.push({ kg, reps });
  }
  return out;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Weeks of day numbers, Monday first, with null for days outside the month.
export function monthGrid(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function nextDayIndex(days: Day[], lastOrder: number | null): number {
  if (lastOrder === null) return 0;
  const i = days.findIndex((d) => d.order > lastOrder);
  return i === -1 ? 0 : i;
}

export function bestOf(lifts: Lift[]): Lift | null {
  let best: Lift | null = null;
  for (const l of lifts) {
    if (!best || l.kg > best.kg || (l.kg === best.kg && l.reps > best.reps)) best = { kg: l.kg, reps: l.reps };
  }
  return best;
}

// Heavier weight, or more reps at the same weight. A first-ever log sets the baseline, so it never counts.
export function isRecord(lift: Lift, best: Lift | null): boolean {
  if (!best) return false;
  return lift.kg > best.kg || (lift.kg === best.kg && lift.reps > best.reps);
}

export function markRecords(prior: Lift | null, lifts: Lift[]): boolean[] {
  let best = prior;
  return lifts.map((l) => {
    const record = isRecord(l, best);
    if (record) best = { kg: l.kg, reps: l.reps };
    return record;
  });
}

export function addWeightHint(last: Lift[], repMax: number, incrementKg: number): number | null {
  if (!last.length || !last.every((l) => l.reps >= repMax)) return null;
  return Math.max(...last.map((l) => l.kg)) + incrementKg;
}

export function prefillSets(last: Lift[], count: number, repMin: number): Lift[] {
  return Array.from({ length: count }, (_, i) => {
    const source = last[i] ?? last[last.length - 1];
    return source ? { kg: source.kg, reps: source.reps } : { kg: 0, reps: repMin };
  });
}

// Weeks start on Monday, in local time.
export function weekStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function previousWeek(start: number): number {
  const d = new Date(start);
  d.setDate(d.getDate() - 7);
  return d.getTime();
}

// Counts consecutive weeks that hit the target. The current week only adds to the
// streak once it hits the target, and it never breaks the streak while still open.
export function weekStreak(finishedAt: number[], target: number, now: number): number {
  const counts = new Map<number, number>();
  for (const t of finishedAt) counts.set(weekStart(t), (counts.get(weekStart(t)) ?? 0) + 1);
  let week = weekStart(now);
  let streak = (counts.get(week) ?? 0) >= target ? 1 : 0;
  week = previousWeek(week);
  while ((counts.get(week) ?? 0) >= target) {
    streak++;
    week = previousWeek(week);
  }
  return streak;
}

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

export function formResponseUrl(formUrl: string): string {
  return formUrl.replace(/\/(viewform|edit)[^/]*$/, '/formResponse');
}

// Finds each question's entry ID from a Google Form page, the same way retrosheet does.
export function formEntries(html: string): Record<string, string> {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!m) throw new Error('That link did not return a readable Google Form.');
  const items: unknown[][] = JSON.parse(m[1])[1][1];
  const out: Record<string, string> = {};
  for (const item of items) {
    const entry = (item[4] as unknown[][] | null)?.[0]?.[0];
    if (entry != null) out[String(item[1]).trim().toLowerCase()] = String(entry);
  }
  return out;
}

export function encodeForm(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

export function fmtKg(n: number): string {
  return String(+n.toFixed(2));
}

export function fmtVolume(kg: number): string {
  return kg >= 1000 ? `${+(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`;
}

export function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function timeAgo(ms: number, now: number): string {
  const min = Math.floor((now - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}

export function shortDate(ms: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(ms);
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export function liftsLine(lifts: Lift[]): string {
  if (!lifts.length) return '';
  const sameWeight = lifts.every((l) => l.kg === lifts[0].kg);
  return sameWeight
    ? `${fmtKg(lifts[0].kg)} × ${lifts.map((l) => l.reps).join(', ')}`
    : lifts.map((l) => `${fmtKg(l.kg)} × ${l.reps}`).join(', ');
}
