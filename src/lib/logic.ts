// Pure rules with no React Native imports, so `bun test` can run them directly.

export type Exercise = { name: string; muscle: string; videoUrl: string; cues: string };
export type RoutineItem = {
  exercise: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  incrementKg: number;
};
export type Day = { order: number; name: string; items: RoutineItem[] };
export type Routine = { exercises: Exercise[]; days: Day[]; weeklyTarget: number };
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
    return { name: r.get('name'), muscle: r.get('muscle') || 'Other', videoUrl: r.get('video_url'), cues: r.get('cues') };
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
    };
    if (item.sets < 1) throw new Error(`routine row ${r.line}: "sets" must be at least 1.`);
    if (!days.has(order)) days.set(order, { order, name: r.get('day_name') || `Day ${order}`, items: [] });
    days.get(order)!.items.push(item);
  }
  if (!days.size) throw new Error('The routine tab has no workouts.');
  let weeklyTarget = 4;
  if (csv.settings) {
    // Google returns the first tab when a tab doesn't exist, so a missing settings tab just means the defaults.
    const header = (parseCsv(csv.settings)[0] ?? []).map((h) => h.trim().toLowerCase());
    const hasSettings = header.includes('key') && header.includes('value');
    const row = hasSettings ? table(csv.settings, 'settings', ['key', 'value']).find((r) => r.get('key') === 'weekly_target') : undefined;
    if (row) {
      weeklyTarget = number(row, 'settings', 'value');
      if (weeklyTarget < 1) throw new Error(`settings row ${row.line}: "weekly_target" must be at least 1.`);
    }
  }
  return { exercises, days: [...days.values()].sort((a, b) => a.order - b.order), weeklyTarget };
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
