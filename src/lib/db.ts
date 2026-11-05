import { openDatabaseSync } from 'expo-sqlite';

import { bestOf, Day, Lift, markRecords, prefillSets, RoutineItem } from './logic';

const db = openDatabaseSync('repsheet.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, day_order INTEGER NOT NULL, day_name TEXT NOT NULL,
    started_at INTEGER NOT NULL, finished_at INTEGER, position INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS session_items (
    session_id TEXT NOT NULL, position INTEGER NOT NULL, exercise TEXT NOT NULL,
    rep_min INTEGER NOT NULL, rep_max INTEGER NOT NULL, rest_sec INTEGER NOT NULL, increment_kg REAL NOT NULL,
    PRIMARY KEY (session_id, position)
  );
  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, position INTEGER NOT NULL, exercise TEXT NOT NULL,
    set_index INTEGER NOT NULL, kg REAL NOT NULL, reps INTEGER NOT NULL, done_at INTEGER, is_record INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS sets_exercise ON sets (exercise, done_at);
  CREATE TABLE IF NOT EXISTS bodyweight (id TEXT PRIMARY KEY, logged_at INTEGER NOT NULL, kg REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS notes (exercise TEXT PRIMARY KEY, text TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS measurements (id TEXT PRIMARY KEY, part TEXT NOT NULL, logged_at INTEGER NOT NULL, cm REAL NOT NULL);
`);

// Each step upgrades phones that already have data, because updates arrive over the air.
if ((db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0) < 1) {
  db.execSync(`
    ALTER TABLE session_items ADD COLUMN superset TEXT NOT NULL DEFAULT '';
    PRAGMA user_version = 1;
  `);
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type WorkoutSet = Lift & { id: string; setIndex: number; doneAt: number | null; isRecord: boolean };
export type WorkoutItem = Omit<RoutineItem, 'sets'> & { position: number; sets: WorkoutSet[] };
export type Workout = {
  id: string; dayOrder: number; dayName: string; startedAt: number; finishedAt: number | null; position: number; items: WorkoutItem[];
};

export function getKv(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key)?.value ?? null;
}
export function setKv(key: string, value: string | null) {
  if (value === null) db.runSync('DELETE FROM kv WHERE key = ?', key);
  else db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
}

const FINISHED_SETS = `FROM sets s JOIN sessions w ON w.id = s.session_id
  WHERE s.exercise = ? AND s.done_at IS NOT NULL AND w.finished_at IS NOT NULL`;

export function bestFinished(exercise: string): Lift | null {
  return bestOf(db.getAllSync<Lift>(`SELECT s.kg, s.reps ${FINISHED_SETS}`, exercise));
}

export function lastLifts(exercise: string): Lift[] {
  const last = db.getFirstSync<{ session_id: string }>(
    `SELECT s.session_id ${FINISHED_SETS} ORDER BY w.finished_at DESC LIMIT 1`, exercise,
  );
  if (!last) return [];
  return db.getAllSync<Lift>(
    'SELECT kg, reps FROM sets WHERE session_id = ? AND exercise = ? AND done_at IS NOT NULL ORDER BY position, set_index',
    last.session_id, exercise,
  );
}

function insertItem(sessionId: string, position: number, item: RoutineItem) {
  db.runSync(
    'INSERT INTO session_items (session_id, position, exercise, rep_min, rep_max, rest_sec, increment_kg, superset) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    sessionId, position, item.exercise, item.repMin, item.repMax, item.restSec, item.incrementKg, item.superset,
  );
  prefillSets(lastLifts(item.exercise), item.sets, item.repMin).forEach((lift, i) => {
    db.runSync(
      'INSERT INTO sets (id, session_id, position, exercise, set_index, kg, reps) VALUES (?, ?, ?, ?, ?, ?, ?)',
      newId(), sessionId, position, item.exercise, i, lift.kg, lift.reps,
    );
  });
}

// Copies the plan into the workout, so editing the sheet mid-workout can't change it.
export function startWorkout(day: Day): string {
  const id = newId();
  db.withTransactionSync(() => {
    db.runSync('INSERT INTO sessions (id, day_order, day_name, started_at) VALUES (?, ?, ?, ?)', id, day.order, day.name, Date.now());
    day.items.forEach((item, i) => insertItem(id, i, item));
  });
  return id;
}

type SessionRow = { id: string; day_order: number; day_name: string; started_at: number; finished_at: number | null; position: number };

function loadRow(row: SessionRow): Workout {
  const items = db.getAllSync<{ position: number; exercise: string; rep_min: number; rep_max: number; rest_sec: number; increment_kg: number; superset: string }>(
    'SELECT * FROM session_items WHERE session_id = ? ORDER BY position', row.id,
  );
  const sets = db.getAllSync<{ id: string; position: number; set_index: number; kg: number; reps: number; done_at: number | null; is_record: number }>(
    'SELECT * FROM sets WHERE session_id = ? ORDER BY position, set_index', row.id,
  );
  return {
    id: row.id, dayOrder: row.day_order, dayName: row.day_name, startedAt: row.started_at, finishedAt: row.finished_at, position: row.position,
    items: items.map((i) => ({
      position: i.position, exercise: i.exercise, repMin: i.rep_min, repMax: i.rep_max, restSec: i.rest_sec, incrementKg: i.increment_kg, superset: i.superset,
      sets: sets.filter((s) => s.position === i.position).map((s) => ({
        id: s.id, setIndex: s.set_index, kg: s.kg, reps: s.reps, doneAt: s.done_at, isRecord: !!s.is_record,
      })),
    })),
  };
}

export function loadActiveWorkout(): Workout | null {
  const row = db.getFirstSync<SessionRow>('SELECT * FROM sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1');
  return row ? loadRow(row) : null;
}

export function loadWorkout(id: string): Workout | null {
  const row = db.getFirstSync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id);
  return row ? loadRow(row) : null;
}

export function setPosition(sessionId: string, position: number) {
  db.runSync('UPDATE sessions SET position = ? WHERE id = ?', position, sessionId);
}

export function updateSet(id: string, lift: Lift) {
  db.runSync('UPDATE sets SET kg = ?, reps = ? WHERE id = ?', lift.kg, lift.reps, id);
}

export function markSetDone(id: string, isRecord: boolean) {
  db.runSync('UPDATE sets SET done_at = ?, is_record = ? WHERE id = ?', Date.now(), isRecord ? 1 : 0, id);
}

export function addSet(sessionId: string, item: WorkoutItem) {
  const tail = item.sets[item.sets.length - 1];
  db.runSync(
    'INSERT INTO sets (id, session_id, position, exercise, set_index, kg, reps) VALUES (?, ?, ?, ?, ?, ?, ?)',
    newId(), sessionId, item.position, item.exercise, tail.setIndex + 1, tail.kg, tail.reps,
  );
}

export function swapItem(sessionId: string, position: number, item: RoutineItem) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM sets WHERE session_id = ? AND position = ?', sessionId, position);
    db.runSync('DELETE FROM session_items WHERE session_id = ? AND position = ?', sessionId, position);
    insertItem(sessionId, position, item);
  });
}

export function discardWorkout(sessionId: string) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM sets WHERE session_id = ?', sessionId);
    db.runSync('DELETE FROM session_items WHERE session_id = ?', sessionId);
    db.runSync('DELETE FROM sessions WHERE id = ?', sessionId);
  });
}

// Drops unticked sets, recalculates records in case a ticked set was edited, then queues the backup.
export function finishWorkout(workout: Workout) {
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM sets WHERE session_id = ? AND done_at IS NULL', workout.id);
    db.runSync('UPDATE sessions SET finished_at = ? WHERE id = ?', now, workout.id);
    for (const item of workout.items) {
      const done = item.sets.filter((s) => s.doneAt !== null);
      const prior = bestOf(db.getAllSync<Lift>(`SELECT s.kg, s.reps ${FINISHED_SETS} AND w.id != ?`, item.exercise, workout.id));
      const flags = markRecords(prior, done);
      done.forEach((s, i) => {
        db.runSync('UPDATE sets SET is_record = ? WHERE id = ?', flags[i] ? 1 : 0, s.id);
        enqueue(s.id, {
          id: s.id, logged_at: new Date(s.doneAt!).toISOString(), type: 'set', day: workout.dayName, exercise: item.exercise,
          set: String(i + 1), weight_kg: String(s.kg), reps: String(s.reps), record: flags[i] ? 'yes' : 'no', value_cm: '',
        });
      });
    }
  });
}

export type Stats = { finishedAt: number[]; lastOrder: number | null; latestRecord: (Lift & { exercise: string }) | null };

export function loadStats(): Stats {
  const sessions = db.getAllSync<{ finished_at: number; day_order: number }>(
    'SELECT finished_at, day_order FROM sessions WHERE finished_at IS NOT NULL ORDER BY finished_at DESC',
  );
  const latestRecord = db.getFirstSync<Lift & { exercise: string }>(
    `SELECT s.exercise, s.kg, s.reps FROM sets s JOIN sessions w ON w.id = s.session_id
     WHERE s.is_record = 1 AND w.finished_at IS NOT NULL ORDER BY s.done_at DESC LIMIT 1`,
  );
  return { finishedAt: sessions.map((s) => s.finished_at), lastOrder: sessions[0]?.day_order ?? null, latestRecord };
}

export function volumeSince(start: number): number {
  return db.getFirstSync<{ v: number | null }>(
    `SELECT SUM(s.kg * s.reps) AS v FROM sets s JOIN sessions w ON w.id = s.session_id
     WHERE w.finished_at >= ? AND s.done_at IS NOT NULL`, start,
  )?.v ?? 0;
}

export function loadHistory(limit = 100): Workout[] {
  return db.getAllSync<SessionRow>('SELECT * FROM sessions WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT ?', limit).map(loadRow);
}

export function topSetSeries(exercise: string, limit = 8): number[] {
  return db.getAllSync<{ top: number }>(
    `SELECT MAX(s.kg) AS top, w.finished_at ${FINISHED_SETS} GROUP BY s.session_id ORDER BY w.finished_at DESC LIMIT ?`, exercise, limit,
  ).map((r) => r.top).reverse();
}

export function loggedExercises(): string[] {
  return db.getAllSync<{ exercise: string }>('SELECT DISTINCT exercise FROM sets WHERE done_at IS NOT NULL').map((r) => r.exercise);
}

export function logBodyweight(kg: number) {
  const id = newId();
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync('INSERT INTO bodyweight (id, logged_at, kg) VALUES (?, ?, ?)', id, now, kg);
    enqueue(id, { id, logged_at: new Date(now).toISOString(), type: 'bodyweight', day: '', exercise: '', set: '', weight_kg: String(kg), reps: '', record: '', value_cm: '' });
  });
}

export function bodyweightSeries(limit = 8): number[] {
  return db.getAllSync<{ kg: number }>('SELECT kg FROM bodyweight ORDER BY logged_at DESC LIMIT ?', limit).map((r) => r.kg).reverse();
}

export function logMeasurement(part: string, cm: number) {
  const id = newId();
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync('INSERT INTO measurements (id, part, logged_at, cm) VALUES (?, ?, ?, ?)', id, part, now, cm);
    enqueue(id, { id, logged_at: new Date(now).toISOString(), type: 'measurement', day: '', exercise: part, set: '', weight_kg: '', reps: '', record: '', value_cm: String(cm) });
  });
}

export function measurementSeries(part: string, limit = 8): number[] {
  return db.getAllSync<{ cm: number }>('SELECT cm FROM measurements WHERE part = ? ORDER BY logged_at DESC LIMIT ?', part, limit).map((r) => r.cm).reverse();
}

export function getNote(exercise: string): string {
  return db.getFirstSync<{ text: string }>('SELECT text FROM notes WHERE exercise = ?', exercise)?.text ?? '';
}
export function setNote(exercise: string, text: string) {
  db.runSync('INSERT OR REPLACE INTO notes (exercise, text) VALUES (?, ?)', exercise, text);
}

function enqueue(id: string, payload: Record<string, string>) {
  db.runSync('INSERT OR REPLACE INTO outbox (id, payload, created_at) VALUES (?, ?, ?)', id, JSON.stringify(payload), Date.now());
}
export function outboxRows(): { id: string; payload: string }[] {
  return db.getAllSync('SELECT id, payload FROM outbox ORDER BY created_at');
}
export function outboxCount(): number {
  return db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')?.n ?? 0;
}
export function outboxRemove(id: string) {
  db.runSync('DELETE FROM outbox WHERE id = ?', id);
}
