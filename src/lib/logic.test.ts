import { expect, test } from 'bun:test';
import { STARTER } from './starter';
import {
  addWeightHint, buildRoutine, encodeForm, formEntries, formResponseUrl, isRecord, liftsLine, markRecords,
  nextDayIndex, parseCsv, prefillSets, weekStart, weekStreak, youtubeId,
} from './logic';

const ROUTINE = 'day_order,day_name,exercise,sets,rep_min,rep_max,rest_sec,increment_kg\n';

test('csv handles quotes, commas, doubled quotes and CRLF', () => {
  expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
});

test('starter routine is a valid three-day cycle', () => {
  const r = buildRoutine(STARTER);
  expect(r.days.map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs']);
  expect(r.weeklyTarget).toBe(4);
  expect(r.days[0].items[0].exercise).toBe('Bench Press');
});

test('broken sheets give a readable error', () => {
  const exercises = 'name,muscle,video_url,cues\nSquat,Legs,,\n';
  expect(() => buildRoutine({ exercises, routine: `${ROUTINE}1,Legs,Lunge,3,8,12,60,2.5\n` })).toThrow('"Lunge" is not in the exercises tab');
  expect(() => buildRoutine({ exercises, routine: `${ROUTINE}1,Legs,Squat,many,8,12,60,2.5\n` })).toThrow('routine row 2: "sets" must be a number');
  expect(() => buildRoutine({ exercises, routine: 'day_order\n1\n' })).toThrow('no "day_name" column');
  expect(() => buildRoutine({ exercises, routine: ROUTINE })).toThrow('no workouts');
});

test('blank rows are ignored and days are sorted by order', () => {
  const exercises = 'name,muscle,video_url,cues\nA,X,,\nB,X,,\n';
  const r = buildRoutine({ exercises, routine: `${ROUTINE}2,Two,B,3,8,12,60,2.5\n,,,,,,,\n1,One,A,3,8,12,60,2.5\n`, settings: 'key,value\nweekly_target,3\n' });
  expect(r.days.map((d) => d.name)).toEqual(['One', 'Two']);
  expect(r.weeklyTarget).toBe(3);
});

test('a missing settings tab falls back to the default target', () => {
  // Google answers a request for a missing tab with the first tab.
  const r = buildRoutine({ exercises: STARTER.exercises, routine: STARTER.routine, settings: STARTER.exercises });
  expect(r.weeklyTarget).toBe(4);
});

test('cycle moves on from the last finished day and wraps', () => {
  const days = [1, 2, 3].map((order) => ({ order, name: String(order), items: [] }));
  expect(nextDayIndex(days, null)).toBe(0);
  expect(nextDayIndex(days, 1)).toBe(1);
  expect(nextDayIndex(days, 3)).toBe(0);
  expect(nextDayIndex(days, 9)).toBe(0);
});

test('records need heavier weight or more reps at the same weight', () => {
  const best = { kg: 60, reps: 10 };
  expect(isRecord({ kg: 62.5, reps: 1 }, best)).toBe(true);
  expect(isRecord({ kg: 60, reps: 11 }, best)).toBe(true);
  expect(isRecord({ kg: 60, reps: 10 }, best)).toBe(false);
  expect(isRecord({ kg: 55, reps: 30 }, best)).toBe(false);
  expect(isRecord({ kg: 100, reps: 5 }, null)).toBe(false);
});

test('records compare against earlier sets in the same workout', () => {
  expect(markRecords({ kg: 60, reps: 10 }, [{ kg: 62.5, reps: 10 }, { kg: 62.5, reps: 10 }, { kg: 62.5, reps: 11 }])).toEqual([true, false, true]);
  expect(markRecords(null, [{ kg: 60, reps: 10 }, { kg: 70, reps: 10 }])).toEqual([false, false]);
});

test('add-weight hint needs the top of the range on every set', () => {
  expect(addWeightHint([{ kg: 20, reps: 12 }, { kg: 20, reps: 12 }], 12, 2)).toBe(22);
  expect(addWeightHint([{ kg: 20, reps: 12 }, { kg: 20, reps: 11 }], 12, 2)).toBeNull();
  expect(addWeightHint([], 12, 2)).toBeNull();
});

test('prefill copies last time, extends short history and handles none', () => {
  expect(prefillSets([{ kg: 60, reps: 10 }], 2, 8)).toEqual([{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }]);
  expect(prefillSets([], 1, 8)).toEqual([{ kg: 0, reps: 8 }]);
});

test('streak counts full weeks and an open week never breaks it', () => {
  const thu = new Date(2026, 10, 5, 12).getTime();
  const week = (n: number, count: number) => Array.from({ length: count }, (_, i) => new Date(2026, 10, 2 - 7 * n + i, 18).getTime());
  expect(weekStart(thu)).toBe(new Date(2026, 10, 2).getTime());
  expect(weekStart(new Date(2026, 10, 8, 23).getTime())).toBe(new Date(2026, 10, 2).getTime());
  expect(weekStreak([...week(1, 4), ...week(2, 4)], 4, thu)).toBe(2);
  expect(weekStreak([...week(0, 4), ...week(1, 4)], 4, thu)).toBe(2);
  expect(weekStreak([...week(0, 1), ...week(1, 4)], 4, thu)).toBe(1);
  expect(weekStreak([...week(1, 3), ...week(2, 4)], 4, thu)).toBe(0);
  expect(weekStreak([], 4, thu)).toBe(0);
});

test('youtube ids come from every common link shape', () => {
  for (const url of ['https://www.youtube.com/watch?v=abc_DEF-123', 'https://youtu.be/abc_DEF-123?t=4', 'https://youtube.com/shorts/abc_DEF-123', 'https://www.youtube.com/watch?list=x&v=abc_DEF-123', 'https://m.youtube.com/embed/abc_DEF-123']) {
    expect(youtubeId(url)).toBe('abc_DEF-123');
  }
  expect(youtubeId('https://example.com/video.mp4')).toBeNull();
  expect(youtubeId('')).toBeNull();
});

test('form helpers read entry ids and encode answers', () => {
  const data = [null, [null, [[1, 'Exercise', null, 0, [[111, null, 0]]], [2, ' Reps ', null, 0, [[222, null, 0]]], [3, 'Section title', null, 8, null]]]];
  expect(formEntries(`<script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(data)};</script>`)).toEqual({ exercise: '111', reps: '222' });
  expect(() => formEntries('<html></html>')).toThrow('readable Google Form');
  expect(formResponseUrl('https://docs.google.com/forms/d/e/abc/viewform?usp=sf_link')).toBe('https://docs.google.com/forms/d/e/abc/formResponse');
  expect(encodeForm({ 'entry.1': 'Bench Press', 'entry.2': '62.5' })).toBe('entry.1=Bench%20Press&entry.2=62.5');
});

test('lifts line compresses repeated weights', () => {
  expect(liftsLine([{ kg: 60, reps: 10 }, { kg: 60, reps: 9 }])).toBe('60 × 10, 9');
  expect(liftsLine([{ kg: 60, reps: 10 }, { kg: 62.5, reps: 9 }])).toBe('60 × 10, 62.5 × 9');
});
