import { expect, test } from 'bun:test';

import { STARTER } from './starter';
import { angle, Frame, Pt, Rep, repCounter, ruleFor, RULES, setSummary, TOO_FAST } from './pose';

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

// Smooth reps from 175° down to the bottom and back, at 20 frames a second unless ms says otherwise.
function run(bottoms: number[], lean = 20, ms = 50): Rep[] {
  const step = repCounter(RULES.squat);
  const reps: Rep[] = [];
  let t = 0;
  const feed = (k: number) => { const r = step(squatter(k, lean), (t += ms)).rep; if (r) reps.push(r); };
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

const fixes = (r: Rep) => r.faults.map((f) => f.fix);

test('deep, upright squats are good reps', () => {
  expect(run([70, 70, 70]).map((r) => [r.n, r.faults])).toEqual([[1, []], [2, []], [3, []]]);
});

test('a half squat counts, says go deeper and by how much', () => {
  const [rep] = run([125], 20, 100);
  expect(rep.faults).toEqual([{ fix: 'Go deeper. Hips down to knee level.', detail: expect.stringMatching(/^Thigh above parallel \d+°, keep it under 10°$/) }]);
});

test('leaning too far forward is flagged with the angle', () => {
  expect(run([70], 65)[0].faults).toEqual([{ fix: 'Chest up. You are leaning too far forward.', detail: expect.stringMatching(/^Torso lean 6\d°, keep it under 55°$/) }]);
});

test('rushed reps are flagged', () => {
  expect(fixes(run([70], 20, 15)[0])).toEqual([TOO_FAST]);
});

test('facing the camera on a side-on exercise asks you to turn', () => {
  const front = squatter(170).map((p, i) => ([11, 23, 25, 27].includes(i) ? [p[0] - 250, p[1], p[2]] : p) as Pt);
  expect(repCounter(RULES.squat)(front, 0)).toEqual({ visible: false, hint: 'Turn side-on to the camera' });
});

test('a set summary counts each fix, most common first', () => {
  const reps = [...run([70, 125], 20, 100), ...run([125], 65, 100)];
  expect(setSummary(reps)).toEqual([
    { fix: 'Go deeper. Hips down to knee level.', count: 2 },
    { fix: 'Chest up. You are leaning too far forward.', count: 1 },
  ]);
});

test('fidgeting is not a rep', () => {
  expect(run([150, 160])).toEqual([]);
});

test('turning around before standing up is a rep that says stand up', () => {
  const step = repCounter(RULES.squat);
  const reps: Rep[] = [];
  let t = 0;
  const feed = (k: number) => { const r = step(squatter(k), (t += 50)).rep; if (r) reps.push(r); };
  for (let k = 175; k >= 70; k -= 5) feed(k);
  for (let k = 70; k <= 130; k += 5) feed(k);
  for (let k = 130; k >= 70; k -= 5) feed(k);
  expect(reps.map(fixes)).toEqual([['Stand all the way up between reps.']]);
});

test('out of view frames are ignored', () => {
  const step = repCounter(RULES.squat);
  expect(step(null, 0)).toEqual({ visible: false });
  expect(step(squatter(170).map(([x, y]) => [x, y, 0.1] as Pt), 50)).toEqual({ visible: false });
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
