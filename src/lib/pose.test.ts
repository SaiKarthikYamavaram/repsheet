import { expect, test } from 'bun:test';

import { STARTER } from './starter';
import { angle, Frame, Pt, Rep, repCounter, ruleFor, RULES } from './pose';

// A side-on body, facing right, with the given knee angle and torso lean. Both sides overlap.
function squatter(kneeDeg: number, leanDeg = 20): Frame {
  const ankle: Pt = [300, 900, 0.9];
  const knee: Pt = [380, 700, 0.9];
  const shin = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]);
  const thighDir = shin + (kneeDeg * Math.PI) / 180;
  const hip: Pt = [knee[0] + 220 * Math.cos(thighDir), knee[1] + 220 * Math.sin(thighDir), 0.9];
  const lean = (leanDeg * Math.PI) / 180;
  const shoulder: Pt = [hip[0] + 300 * Math.sin(lean), hip[1] - 300 * Math.cos(lean), 0.9];
  const f: Frame = Array.from({ length: 33 }, () => [0, 0, 0] as Pt);
  for (const [i, p] of [[11, shoulder], [12, shoulder], [23, hip], [24, hip], [25, knee], [26, knee], [27, ankle], [28, ankle]] as const) f[i] = p;
  return f;
}

// Smooth reps from 175° down to the bottom and back.
function run(bottoms: number[], lean = 20): Rep[] {
  const step = repCounter(RULES.squat);
  const reps: Rep[] = [];
  const feed = (k: number) => { const r = step(squatter(k, lean)).rep; if (r) reps.push(r); };
  for (const bottom of bottoms) {
    for (let k = 175; k > bottom; k -= 5) feed(k);
    for (let k = bottom; k <= 175; k += 5) feed(k);
  }
  return reps;
}

test('angle', () => {
  expect(angle([0, 1, 1], [0, 0, 1], [1, 0, 1])).toBeCloseTo(90);
  expect(angle([-1, 0, 1], [0, 0, 1], [1, 0, 1])).toBeCloseTo(180);
  expect(angle(...squatter(95).slice(23, 28).filter((_, i) => i % 2 === 0) as [Pt, Pt, Pt])).toBeCloseTo(95);
});

test('deep, upright squats are good reps', () => {
  expect(run([70, 70, 70])).toEqual([{ n: 1, faults: [] }, { n: 2, faults: [] }, { n: 3, faults: [] }]);
});

test('a half squat counts but says go deeper', () => {
  expect(run([125])).toEqual([{ n: 1, faults: ['Go deeper. Hips down to knee level.'] }]);
});

test('leaning too far forward is flagged', () => {
  expect(run([70], 65)[0].faults).toEqual(['Chest up. You are leaning too far forward.']);
});

test('fidgeting is not a rep', () => {
  expect(run([150, 160])).toEqual([]);
});

test('turning around before standing up is a rep that says stand up', () => {
  const step = repCounter(RULES.squat);
  const reps: Rep[] = [];
  const feed = (k: number) => { const r = step(squatter(k)).rep; if (r) reps.push(r); };
  for (let k = 175; k >= 70; k -= 5) feed(k);
  for (let k = 70; k <= 130; k += 5) feed(k);
  for (let k = 130; k >= 70; k -= 5) feed(k);
  expect(reps).toEqual([{ n: 1, faults: ['Stand all the way up between reps.'] }]);
});

test('out of view frames are ignored', () => {
  const step = repCounter(RULES.squat);
  expect(step(null)).toEqual({ visible: false });
  expect(step(squatter(170).map(([x, y]) => [x, y, 0.1] as Pt))).toEqual({ visible: false });
});

test('sheet names map to the right checks', () => {
  expect(ruleFor('Squat')).toBe(RULES.squat);
  expect(ruleFor('Bodyweight squats')).toBe(RULES.squat);
  expect(ruleFor('Romanian Deadlift')).toBe(RULES.rdl);
  expect(ruleFor('Hammer Curl')).toBe(RULES.curl);
  expect(ruleFor('Dumbbell Shoulder Press')).toBe(RULES.press);
  expect(ruleFor('Triceps Pushdown')).toBe(RULES.pushdown);
  expect(ruleFor('Push-ups')).toBe(RULES.pushup);
  expect(ruleFor('Barbell Row')).toBe(RULES.row);
  expect(ruleFor('Leg Curl')).toBe(RULES.legCurl);
  expect(ruleFor('Preacher Curls')).toBe(RULES.preacher);
  expect(ruleFor('Seated Row')).toBe(RULES.seatedRow);
  expect(ruleFor('Machine Incline Press')).toBe(RULES.benchPress);
  expect(ruleFor('Flat Dumbbell Fly')).toBe(RULES.fly);
});

test('every starter exercise gets a check except shrugs and calf raises', () => {
  const names = STARTER.exercises.trim().split('\n').slice(1).map((l) => l.split(',')[0]);
  expect(names.filter((n) => !ruleFor(n))).toEqual(['Dumbbell Shrugs', 'Calf Raise']);
});
