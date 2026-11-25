// Form checks for the pose checker. The camera page sends MediaPipe's 33 pose landmarks each frame,
// in pixels, and this turns them into reps and form faults.

export type Pt = [x: number, y: number, visibility: number];
export type Frame = Pt[];

const LEFT = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
const RIGHT = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };
type Joint = keyof typeof LEFT;
type Side = Record<Joint, Pt>;
// s is the side facing the camera; l and r are both sides, for front-on exercises.
export type Body = { s: Side; l: Side; r: Side };

type Check = { fix: string; bad: (b: Body) => boolean; atPeak?: boolean };
export type Rule = {
  view: 'side' | 'front';
  setup: string;
  how: string[];
  joints: Joint[];
  // High at the start position, low at the hardest point of the rep.
  metric: (b: Body) => number;
  down: number; // a full rep gets below this
  up: number; // and comes back above this
  reach: string; // fix when the rep doesn't get below down
  back: string; // fix when the rep turns around before getting back above up
  checks: Check[];
};

// Angle at b, in degrees.
export function angle(a: Pt, b: Pt, c: Pt): number {
  const d = Math.abs((Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0])) * 180 / Math.PI);
  return d > 180 ? 360 - d : d;
}

// How far the line from bottom up to top leans away from vertical, in degrees.
const tilt = (top: Pt, bottom: Pt) => Math.atan2(Math.abs(top[0] - bottom[0]), bottom[1] - top[1]) * 180 / Math.PI;
const elbow = (s: Side) => angle(s.shoulder, s.elbow, s.wrist);
const knee = (s: Side) => angle(s.hip, s.knee, s.ankle);
const armOut = (s: Side) => angle(s.hip, s.shoulder, s.elbow);
const lean = (b: Body) => tilt(b.s.shoulder, b.s.hip);

const SIDE_LEGS = 'Phone at hip height, 2–3 m to your side, whole body in view.';
const SIDE_ARMS = 'Phone at chest height, 2 m to your side, from your head to your knees in view.';
const FRONT_ARMS = 'Phone at chest height, 2 m in front of you, from your head to your hips in view.';
const PINNED = { fix: 'Keep your elbows pinned to your sides.', bad: (b: Body) => armOut(b.s) > 35 };

export const RULES = {
  squat: {
    view: 'side', setup: SIDE_LEGS, joints: ['shoulder', 'hip', 'knee', 'ankle'],
    how: [
      'Feet shoulder-width apart, toes turned slightly out.',
      'Brace your core, then sit your hips back and down.',
      'Go down until your hips are level with your knees.',
      'Keep your chest up and knees over your toes, then drive up through your whole foot.',
    ],
    metric: (b) => knee(b.s), down: 110, up: 160,
    reach: 'Go deeper. Hips down to knee level.',
    back: 'Stand all the way up between reps.',
    checks: [
      { fix: 'Go deeper. Hips down to knee level.', atPeak: true, bad: (b) => b.s.knee[1] - b.s.hip[1] > 0.15 * Math.hypot(b.s.knee[0] - b.s.hip[0], b.s.knee[1] - b.s.hip[1]) },
      { fix: 'Chest up. You are leaning too far forward.', bad: (b) => lean(b) > 55 },
    ],
  },
  rdl: {
    view: 'side', setup: SIDE_LEGS, joints: ['shoulder', 'hip', 'knee', 'ankle'],
    how: [
      'Stand tall, bar against your thighs, knees soft.',
      'Push your hips back, sliding the bar down your legs.',
      'Keep your back flat and your shins nearly vertical.',
      'Stop when your hamstrings stretch, then squeeze your glutes to stand up.',
    ],
    metric: (b) => angle(b.s.shoulder, b.s.hip, b.s.knee), down: 125, up: 160,
    reach: 'Hinge further. Push your hips back until your hamstrings stretch.',
    back: 'Stand tall and squeeze your glutes at the top.',
    checks: [{ fix: 'Less knee bend. Push your hips back instead of squatting down.', bad: (b) => knee(b.s) < 135 }],
  },
  curl: {
    view: 'side', setup: SIDE_ARMS, joints: ['shoulder', 'elbow', 'wrist', 'hip'],
    how: [
      'Stand tall with your elbows at your sides.',
      'Curl up by bending only at the elbow.',
      'Squeeze at the top, then lower slowly until your arm is straight.',
      'Keep your body still. No swinging.',
    ],
    metric: (b) => elbow(b.s), down: 70, up: 145,
    reach: 'Curl all the way up.',
    back: 'Lower until your arm is straight.',
    checks: [PINNED, { fix: 'Stop swinging. Keep your body still.', bad: (b) => lean(b) > 15 }],
  },
  press: {
    view: 'front', setup: FRONT_ARMS, joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Start with the weights at shoulder height, elbows just in front of your body.',
      'Brace your core and keep your ribs down.',
      'Press straight up until your arms are straight.',
      'Lower back to shoulder height under control.',
    ],
    metric: (b) => 180 - (elbow(b.l) + elbow(b.r)) / 2, down: 25, up: 80,
    reach: 'Press all the way up until your arms are straight.',
    back: 'Lower the weights to shoulder height.',
    checks: [
      { fix: 'Press both arms evenly.', bad: (b) => Math.abs(elbow(b.l) - elbow(b.r)) > 25 },
      { fix: 'Stack your wrists over your elbows.', bad: (b) => [b.l, b.r].some((s) => tilt(s.wrist, s.elbow) > 35) },
    ],
  },
  lateral: {
    view: 'front', setup: FRONT_ARMS, joints: ['shoulder', 'elbow', 'hip'],
    how: [
      'Stand tall, weights at your sides, a slight bend in your elbows.',
      'Raise your arms out to the sides, leading with your elbows.',
      'Stop at shoulder height.',
      'Lower slowly. No shrugging or swinging.',
    ],
    metric: (b) => 180 - (armOut(b.l) + armOut(b.r)) / 2, down: 105, up: 150,
    reach: 'Raise your arms to shoulder height.',
    back: 'Lower your arms all the way down.',
    checks: [
      { fix: 'Stop at shoulder height. Higher moves the work to your traps.', atPeak: true, bad: (b) => (armOut(b.l) + armOut(b.r)) / 2 > 105 },
      { fix: 'Raise both arms evenly.', bad: (b) => Math.abs(armOut(b.l) - armOut(b.r)) > 20 },
    ],
  },
  pushdown: {
    view: 'side', setup: SIDE_ARMS, joints: ['shoulder', 'elbow', 'wrist', 'hip'],
    how: [
      'Stand tall with your elbows pinned to your sides.',
      'Push down until your arms are straight.',
      'Squeeze your triceps, then let your hands rise to chest height.',
      'Only your forearms move.',
    ],
    metric: (b) => 180 - elbow(b.s), down: 25, up: 80,
    reach: 'Push all the way down until your arms are straight.',
    back: 'Let your hands come back up to chest height.',
    checks: [PINNED, { fix: 'Stand taller. Don’t lean over the bar.', bad: (b) => lean(b) > 35 }],
  },
  lunge: {
    view: 'side', setup: `${SIDE_LEGS} Lunge in place so you stay in view.`, joints: ['shoulder', 'hip', 'knee', 'ankle'],
    how: [
      'Take a long step, feet hip-width apart.',
      'Lower straight down until your back knee nearly touches the floor.',
      'Keep your front knee over your ankle and your torso upright.',
      'Push through your front heel to stand up.',
    ],
    // The front leg is the one that bends most.
    metric: (b) => Math.min(knee(b.l), knee(b.r)), down: 105, up: 155,
    reach: 'Lower until your back knee nearly touches the floor.',
    back: 'Stand all the way up.',
    checks: [{ fix: 'Keep your torso upright.', bad: (b) => lean(b) > 25 }],
  },
  pushup: {
    view: 'side', setup: 'Phone on the floor, 2 m to your side, whole body in view.', joints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
    how: [
      'Hands just wider than your shoulders, body straight from head to heels.',
      'Lower your chest to just above the floor, elbows at about 45°.',
      'Push back up until your arms are straight.',
      'Keep your hips level. No sagging or piking.',
    ],
    metric: (b) => elbow(b.s), down: 95, up: 150,
    reach: 'Lower your chest closer to the floor.',
    back: 'Push all the way up until your arms are straight.',
    checks: [{ fix: 'Keep your hips in line with your shoulders and heels.', bad: (b) => angle(b.s.shoulder, b.s.hip, b.s.ankle) < 160 }],
  },
  row: {
    view: 'side', setup: SIDE_LEGS, joints: ['shoulder', 'elbow', 'wrist', 'hip'],
    how: [
      'Hinge forward with a flat back, chest at 45° or lower.',
      'Pull the bar to your lower chest, driving your elbows back.',
      'Squeeze your shoulder blades, then lower until your arms are straight.',
      'Keep your torso still. Don’t stand up to move the weight.',
    ],
    metric: (b) => elbow(b.s), down: 100, up: 150,
    reach: 'Pull the bar all the way to your lower chest.',
    back: 'Lower until your arms are straight.',
    checks: [{ fix: 'Hinge more. Bring your chest closer to parallel.', bad: (b) => lean(b) < 40 }],
  },
  benchPress: {
    view: 'side', setup: 'Phone at bench height, 2 m to your side, from your head to your hips in view.', joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Feet flat, shoulder blades squeezed together and down.',
      'Lower the weight to your chest with your elbows at about 45°.',
      'Keep your forearms vertical, wrists stacked over your elbows.',
      'Press up until your arms are straight, without bouncing.',
    ],
    metric: (b) => elbow(b.s), down: 95, up: 155,
    reach: 'Lower the weight all the way to your chest.',
    back: 'Press all the way up until your arms are straight.',
    checks: [{ fix: 'Keep your forearms vertical, wrists over your elbows.', bad: (b) => tilt(b.s.wrist, b.s.elbow) > 30 }],
  },
  fly: {
    view: 'front', setup: 'Phone 2 m in front of you, facing you, arms and shoulders in view. For dumbbell flys, put it at your feet looking up the bench.', joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Keep a slight bend in your elbows the whole time.',
      'Open your arms wide until you feel a stretch across your chest.',
      'Bring your hands together in a wide arc, like hugging a tree.',
      'Squeeze your chest in the middle, then open slowly.',
    ],
    // How far apart your hands are, in shoulder widths, scaled so a full rep moves about 100.
    metric: (b) => 60 * Math.hypot(b.l.wrist[0] - b.r.wrist[0], b.l.wrist[1] - b.r.wrist[1]) / Math.max(1, Math.hypot(b.l.shoulder[0] - b.r.shoulder[0], b.l.shoulder[1] - b.r.shoulder[1])),
    down: 70, up: 140,
    reach: 'Bring your hands all the way together.',
    back: 'Open your arms wider for a full stretch.',
    checks: [{ fix: 'Keep your elbows only slightly bent. Don’t turn it into a press.', bad: (b) => (elbow(b.l) + elbow(b.r)) / 2 < 120 }],
  },
  skullCrusher: {
    view: 'side', setup: 'Phone at bench height, 2 m to your side, from your head to your hips in view.', joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Lie on the bench, arms straight up over your shoulders.',
      'Bend only at the elbows to lower the bar to your forehead.',
      'Keep your upper arms still and pointing up.',
      'Straighten your arms to lift it back up.',
    ],
    metric: (b) => elbow(b.s), down: 85, up: 150,
    reach: 'Lower the bar all the way to your forehead.',
    back: 'Straighten your arms fully at the top.',
    checks: [{ fix: 'Keep your upper arms still, pointing up.', bad: (b) => tilt(b.s.elbow, b.s.shoulder) > 35 }],
  },
  pulldown: {
    view: 'front', setup: FRONT_ARMS, joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Grip just wider than your shoulders, thighs locked under the pad.',
      'Pull your elbows down to your ribs, bringing the bar to your upper chest.',
      'Lean back only slightly and keep your chest up.',
      'Let your arms straighten fully on the way up.',
    ],
    metric: (b) => (elbow(b.l) + elbow(b.r)) / 2, down: 80, up: 150,
    reach: 'Pull the bar down to your upper chest.',
    back: 'Let your arms straighten all the way at the top.',
    checks: [{ fix: 'Pull with both arms evenly.', bad: (b) => Math.abs(elbow(b.l) - elbow(b.r)) > 25 }],
  },
  seatedRow: {
    view: 'side', setup: 'Phone at seat height, 2 m to your side, from your head to your knees in view.', joints: ['shoulder', 'elbow', 'wrist', 'hip'],
    how: [
      'Sit tall, knees slightly bent, chest up.',
      'Pull the handle to your stomach, driving your elbows back.',
      'Squeeze your shoulder blades together.',
      'Straighten your arms slowly without leaning forward or back.',
    ],
    metric: (b) => elbow(b.s), down: 100, up: 150,
    reach: 'Pull the handle all the way to your stomach.',
    back: 'Straighten your arms fully on the way back.',
    checks: [{ fix: 'Sit tall. Don’t rock back to pull.', bad: (b) => lean(b) > 25 }],
  },
  facePull: {
    view: 'front', setup: FRONT_ARMS, joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Set the rope at face height and step back until your arms are straight.',
      'Pull the rope towards your forehead, splitting it apart.',
      'Keep your elbows high, at shoulder level or above.',
      'Squeeze your rear delts, then straighten your arms slowly.',
    ],
    metric: (b) => (elbow(b.l) + elbow(b.r)) / 2, down: 90, up: 150,
    reach: 'Pull the rope all the way to your forehead.',
    back: 'Straighten your arms fully between reps.',
    checks: [{
      fix: 'Elbows high, at shoulder level.', atPeak: true,
      bad: (b) => [b.l, b.r].some((s) => s.elbow[1] - s.shoulder[1] > 0.3 * Math.hypot(s.elbow[0] - s.shoulder[0], s.elbow[1] - s.shoulder[1])),
    }],
  },
  preacher: {
    view: 'side', setup: SIDE_ARMS, joints: ['shoulder', 'elbow', 'wrist'],
    how: [
      'Upper arms flat on the pad, armpits snug against the top.',
      'Curl up by bending only at the elbow.',
      'Lower slowly until your arms are nearly straight.',
      'Don’t lift your elbows off the pad.',
    ],
    metric: (b) => elbow(b.s), down: 70, up: 145,
    reach: 'Curl all the way up.',
    back: 'Lower until your arms are nearly straight for a full stretch.',
    checks: [],
  },
  legExtension: {
    view: 'side', setup: 'Phone at seat height, 2 m to your side, from your shoulders to your feet in view.', joints: ['hip', 'knee', 'ankle'],
    how: [
      'Back flat on the pad, knees lined up with the machine’s pivot.',
      'Straighten your legs fully.',
      'Pause and squeeze your quads at the top.',
      'Lower slowly until your knees are bent to about 90°.',
    ],
    metric: (b) => 180 - knee(b.s), down: 25, up: 80,
    reach: 'Straighten your legs fully and squeeze.',
    back: 'Lower until your knees bend to about 90°.',
    checks: [],
  },
  legPress: {
    view: 'side', setup: 'Phone at seat height, 2 m to your side, whole body in view.', joints: ['shoulder', 'hip', 'knee', 'ankle'],
    how: [
      'Feet shoulder-width on the platform, lower back flat on the pad.',
      'Lower until your knees bend to about 90°.',
      'Push through your whole foot to press back up.',
      'Stop just short of locking your knees.',
    ],
    metric: (b) => knee(b.s), down: 100, up: 150,
    reach: 'Lower until your knees bend to about 90°.',
    back: 'Press back up nearly all the way.',
    checks: [
      { fix: 'Don’t lock your knees at the top.', bad: (b) => knee(b.s) > 175 },
      { fix: 'Not so deep. Your lower back is lifting off the pad.', atPeak: true, bad: (b) => angle(b.s.shoulder, b.s.hip, b.s.knee) < 55 },
    ],
  },
  legCurl: {
    view: 'side', setup: 'Phone at machine height, 2 m to your side, from your hips to your feet in view.', joints: ['hip', 'knee', 'ankle'],
    how: [
      'Knees lined up with the machine’s pivot, hips pressed into the pad.',
      'Curl your heels towards your glutes.',
      'Squeeze at the top.',
      'Lower slowly until your legs are nearly straight.',
    ],
    metric: (b) => knee(b.s), down: 90, up: 150,
    reach: 'Curl your heels further towards your glutes.',
    back: 'Lower until your legs are nearly straight.',
    checks: [],
  },
  backExtension: {
    view: 'side', setup: SIDE_LEGS, joints: ['shoulder', 'hip', 'knee'],
    how: [
      'Hips just above the pad, body straight, arms crossed on your chest.',
      'Hinge at the hips to lower your chest towards the floor.',
      'Keep your back flat the whole way.',
      'Rise until your body is straight, not arched back.',
    ],
    metric: (b) => angle(b.s.shoulder, b.s.hip, b.s.knee), down: 125, up: 160,
    reach: 'Lower further until you feel your hamstrings stretch.',
    back: 'Rise until your body is in a straight line.',
    checks: [],
  },
} satisfies Record<string, Rule>;

// First match wins. Names come from your sheet, so this matches words rather than exact names.
// Shrugs and calf raises move too little for the camera to judge.
const MATCH: [RegExp, keyof typeof RULES | null][] = [
  [/shrug|calf/i, null],
  [/leg curl|hamstring curl/i, 'legCurl'],
  [/leg extension/i, 'legExtension'],
  [/leg press/i, 'legPress'],
  [/preacher/i, 'preacher'],
  [/skull|lying triceps|french press/i, 'skullCrusher'],
  [/back extension|hyperextension/i, 'backExtension'],
  [/fly|flye|pec deck/i, 'fly'],
  [/face pull/i, 'facePull'],
  [/pulldown|pull-down|pull.?up|chin.?up/i, 'pulldown'],
  [/seated row|cable row/i, 'seatedRow'],
  [/bench|incline|decline|chest press|floor press/i, 'benchPress'],
  [/romanian|rdl|stiff.?leg/i, 'rdl'],
  [/squat/i, 'squat'],
  [/lunge/i, 'lunge'],
  [/push.?up/i, 'pushup'],
  [/push.?down/i, 'pushdown'],
  [/lateral raise/i, 'lateral'],
  [/shoulder press|overhead press|military press/i, 'press'],
  [/curl/i, 'curl'],
  [/row/i, 'row'],
];

export function ruleFor(exercise: string): Rule | undefined {
  const key = MATCH.find(([re]) => re.test(exercise))?.[1];
  return key ? RULES[key] : undefined;
}

const MIN_VISIBLE = 0.5;
const TURN = 12; // degrees the angle must reverse by before it counts as a turn, so jitter isn't a rep
const MIN_REP = 30; // smaller movements are fidgeting, not reps
const FAULT_FRAMES = 3; // a fault must show this many frames in a rep, so one bad frame isn't blamed on you

function body(f: Frame, rule: Rule): Body | null {
  const pick = (map: typeof LEFT) => Object.fromEntries(Object.entries(map).map(([k, i]) => [k, f[i]])) as Side;
  const l = pick(LEFT);
  const r = pick(RIGHT);
  const seen = (s: Side) => Math.min(...rule.joints.map((j) => s[j]?.[2] ?? 0));
  const lv = seen(l);
  const rv = seen(r);
  if ((rule.view === 'front' ? Math.min(lv, rv) : Math.max(lv, rv)) < MIN_VISIBLE) return null;
  return { s: lv >= rv ? l : r, l, r };
}

export type Rep = { n: number; faults: string[] };
export type Step = { visible: boolean; rep?: Rep };

// Feed it one frame at a time. A rep ends when you get back to the start position,
// or when you turn around early, which is a rep with a fault.
export function repCounter(rule: Rule) {
  let reps = 0;
  let inRep = false;
  let top = -Infinity;
  let low = Infinity;
  let high = -Infinity;
  let peak: Body | null = null;
  let counts = new Map<string, number>();

  const begin = (from: number, m: number, b: Body) => {
    inRep = true; top = from; low = m; high = -Infinity; peak = b; counts = new Map();
  };

  return (f: Frame | null): Step => {
    const b = f && body(f, rule);
    if (!b) return { visible: false };
    const m = rule.metric(b);
    if (!inRep) {
      top = Math.max(top, m);
      if (m < top - TURN) begin(top, m, b);
      return { visible: true };
    }

    for (const c of rule.checks) if (!c.atPeak && c.bad(b)) counts.set(c.fix, (counts.get(c.fix) ?? 0) + 1);
    if (m < low) { low = m; peak = b; high = -Infinity; } else high = Math.max(high, m);

    const home = m >= rule.up && m > low + TURN;
    const turned = !home && high - low >= MIN_REP && m < high - TURN;
    if (!home && !turned) return { visible: true };

    const counted = top - low >= MIN_REP;
    const faults = new Set<string>();
    if (counted) {
      if (low > rule.down) faults.add(rule.reach);
      if (turned) faults.add(rule.back);
      for (const c of rule.checks) {
        if (c.atPeak ? c.bad(peak!) : (counts.get(c.fix) ?? 0) >= FAULT_FRAMES) faults.add(c.fix);
      }
    }
    if (home) { inRep = false; top = m; } else begin(high, m, b);
    return counted ? { visible: true, rep: { n: ++reps, faults: [...faults] } } : { visible: true };
  };
}
