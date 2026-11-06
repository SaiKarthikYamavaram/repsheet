import { useKeepAwake } from 'expo-keep-awake';
import { Observe } from 'expo-observe';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, AppState, Easing, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormVideo } from '@/components/form-video';
import { PlateBar } from '@/components/plate-bar';
import { Card, Ghost, H1, H2, HeatButton, Hint, HotText, Icon, NumberField, RoundButton, Ring, Screen, Sheet, Sub } from '@/components/ui';
import { addSet, bestFinished, discardWorkout, finishWorkout, getKv, getNote, lastLifts, loadActiveWorkout, markSetDone, setKv, setPosition, swapItem, updateSet, Workout, WorkoutItem } from '@/lib/db';
import { addWeightHint, bestOf, clock, fmtKg, isRecord, liftsLine, nextAfterSet, platesFor, RoutineItem, warmupSets } from '@/lib/logic';
import { cancelRestAlert, scheduleRestAlert } from '@/lib/rest-alert';
import { flushOutbox, useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

type Rest = { endsAt: number; total: number; label: string };

const repsText = (n: number) => String(n);

function readRest(): Rest | null {
  try {
    const rest: Rest | null = JSON.parse(getKv('rest') ?? 'null');
    return rest && rest.endsAt > Date.now() ? rest : null;
  } catch {
    return null;
  }
}

function nextLabel(target: WorkoutItem, current: WorkoutItem): string {
  const next = target.sets.findIndex((s) => !s.doneAt);
  if (next < 0) return 'Workout almost done';
  const set = `Set ${next + 1}, ${fmtKg(target.sets[next].kg)} kg × ${target.sets[next].reps}`;
  return target.position === current.position ? `Next: ${set}` : `Next: ${target.exercise}, ${set}`;
}

const platesLine = (plates: number[]) => plates.map(fmtKg).join(' + ');

export default function WorkoutScreen() {
  useKeepAwake();
  const sync = useSync();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState<Workout | null>(loadActiveWorkout);
  const [sel, setSel] = useState<number | null>(null);
  const [rest, setRest] = useState<Rest | null>(readRest);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!loadActiveWorkout()) router.replace('/');
  }, []));

  const item = w?.items[Math.min(w.position, w.items.length - 1)];
  const exerciseName = item?.exercise ?? '';
  const last = useMemo(() => (exerciseName ? lastLifts(exerciseName) : []), [exerciseName]);
  const note = useMemo(() => (exerciseName ? getNote(exerciseName) : ''), [exerciseName]);

  if (!w || !item) return <Screen>{null}</Screen>;

  const reload = () => setW(loadActiveWorkout());
  const move = (position: number) => {
    if (position < 0 || position >= w.items.length) return;
    setPosition(w.id, position);
    setSel(null);
    reload();
  };

  const firstOpen = item.sets.findIndex((s) => !s.doneAt);
  const selected = sel !== null && item.sets[sel] ? sel : firstOpen;
  const set = selected >= 0 ? item.sets[selected] : null;
  const allDone = firstOpen === -1;
  const isLast = w.position === w.items.length - 1;
  const info = sync.routine.exercises.find((e) => e.name === item.exercise);
  const hintKg = addWeightHint(last, item.repMax, item.incrementKg);
  const { barKg, plates } = sync.routine;
  const barbell = info?.equipment === 'barbell';
  const workKg = set?.kg ?? item.sets[0].kg;
  const load = platesFor(workKg, barKg, plates);
  const warmups = warmupSets(workKg, barKg, item.incrementKg || 2.5, barbell);
  const partners = item.superset ? w.items.filter((i) => i.superset === item.superset && i.position !== item.position).map((i) => i.exercise) : [];

  const changeWeight = (kg: number) => {
    if (!set) return;
    updateSet(set.id, { kg, reps: set.reps });
    // Later unticked sets follow, so one change updates the rest of the exercise.
    item.sets.slice(selected + 1).filter((s) => !s.doneAt).forEach((s) => updateSet(s.id, { kg, reps: s.reps }));
    reload();
  };
  const changeReps = (reps: number) => {
    if (!set) return;
    updateSet(set.id, { kg: set.kg, reps });
    reload();
  };

  const startRest = (fresh: Workout) => {
    const current = fresh.items[fresh.position];
    const plan = nextAfterSet(fresh.items, fresh.position);
    if (!plan.rest || current.restSec <= 0) {
      afterRest(fresh);
      return;
    }
    const label = nextLabel(fresh.items[plan.position], current);
    const next: Rest = { endsAt: Date.now() + current.restSec * 1000, total: current.restSec, label };
    setRest(next);
    setKv('rest', JSON.stringify(next));
    scheduleRestAlert(current.restSec, label);
  };

  const afterRest = (fresh: Workout | null = loadActiveWorkout()) => {
    if (!fresh) return;
    const { position } = nextAfterSet(fresh.items, fresh.position);
    if (position !== fresh.position) setPosition(fresh.id, position);
    setSel(null);
    reload();
  };

  const endRest = () => {
    setRest(null);
    setKv('rest', null);
    cancelRestAlert();
    afterRest();
  };

  const doneSet = () => {
    if (!set) return;
    Keyboard.dismiss();
    if (set.doneAt) {
      setSel(null);
      return;
    }
    const prior = bestFinished(item.exercise);
    const best = prior && bestOf([prior, ...item.sets.filter((s) => s.doneAt)]);
    const record = isRecord(set, best);
    markSetDone(set.id, record);
    setSel(null);
    const fresh = loadActiveWorkout();
    setW(fresh);
    if (record) {
      Vibration.vibrate([0, 120, 60, 240]);
      setCelebrate(`${item.exercise} ${fmtKg(set.kg)} kg × ${set.reps}`);
    } else {
      Vibration.vibrate(40);
      if (fresh) startRest(fresh);
    }
  };

  const finish = () => {
    const doneCount = w.items.flatMap((i) => i.sets).filter((s) => s.doneAt).length;
    const openCount = w.items.flatMap((i) => i.sets).length - doneCount;
    const complete = () => {
      setKv('rest', null);
      cancelRestAlert();
      if (!doneCount) {
        discardWorkout(w.id);
        router.replace('/');
        return;
      }
      finishWorkout(loadActiveWorkout() ?? w);
      Observe.logEvent('workout.finished', { attributes: { sets: doneCount, skippedSets: openCount } });
      flushOutbox();
      router.replace({ pathname: '/finish', params: { id: w.id } });
    };
    if (!openCount) { complete(); return; }
    Alert.alert(
      doneCount ? 'Finish workout?' : 'Discard workout?',
      doneCount ? `${openCount} unticked ${openCount === 1 ? 'set' : 'sets'} won't be logged.` : 'You haven’t ticked any sets, so nothing will be logged.',
      [{ text: 'Keep going', style: 'cancel' }, { text: doneCount ? 'Finish' : 'Discard', style: 'destructive', onPress: complete }],
    );
  };

  const swapTo = (next: RoutineItem) => {
    swapItem(w.id, w.position, { ...next, superset: item.superset });
    setSwapOpen(false);
    setSel(null);
    reload();
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.top}>
          <RoundButton icon="back" label="Back to Today" onPress={() => router.back()} />
          <Sub style={styles.topTitle}>{w.dayName} · {w.position + 1} of {w.items.length}</Sub>
          <Ghost label="Finish" onPress={finish} style={{ flexGrow: 0 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          onTouchStart={(e) => { touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
          onTouchEnd={(e) => {
            if (!touch.current) return;
            const dx = e.nativeEvent.pageX - touch.current.x;
            const dy = e.nativeEvent.pageY - touch.current.y;
            touch.current = null;
            if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) move(w.position + (dx < 0 ? 1 : -1));
          }}
        >
          <FormVideo key={item.exercise} url={info?.videoUrl ?? ''} />
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <H1>{item.exercise}</H1>
                <Sub>{item.sets.length} sets · {item.repMin}–{item.repMax} reps · {item.restSec}s rest</Sub>
                {partners.length > 0 && <Text style={styles.superset}>SUPERSET WITH {partners.join(' + ').toUpperCase()}</Text>}
              </View>
              <View style={styles.pager}>
                <RoundButton icon="back" label="Previous exercise" size={36} disabled={w.position === 0} onPress={() => move(w.position - 1)} />
                <RoundButton icon="next" label="Next exercise" size={36} disabled={isLast} onPress={() => move(w.position + 1)} />
              </View>
            </View>

            {last.length > 0 && (
              <Card style={styles.lastCard}>
                <Sub>Last time</Sub>
                <Text style={styles.lastText}>{liftsLine(last)}</Text>
              </Card>
            )}
            {hintKg !== null && <Hint title={`Try ${fmtKg(hintKg)} kg`} detail={`You hit ${item.repMax} reps on every set last time`} />}
            {note !== '' && <Sub>Your note: {note}</Sub>}
            {info?.cues ? <Sub>{info.cues}</Sub> : null}

            <View style={{ gap: 6 }}>
              {item.sets.map((s, i) => (
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Set ${i + 1}, ${fmtKg(s.kg)} kilograms, ${s.reps} reps${s.doneAt ? ', done' : ''}`} onPress={() => setSel(i)} style={[styles.row, i === selected && styles.rowNow]}>
                  <Text style={styles.rowN}>{i + 1}</Text>
                  <View style={styles.rowValue}><Text style={styles.rowNum}>{fmtKg(s.kg)}</Text><Text style={styles.rowUnit}>kg</Text></View>
                  <View style={styles.rowValue}>
                    <Text style={styles.rowNum}>{s.reps}</Text><Text style={styles.rowUnit}>reps</Text>
                    {s.isRecord && <View style={styles.pr}><Text style={styles.prText}>PR</Text></View>}
                  </View>
                  <View style={[styles.chk, !!s.doneAt && styles.chkOn]}>{!!s.doneAt && <Icon name="check" size={15} color={colors.onHeat} />}</View>
                </Pressable>
              ))}
            </View>

            {barbell && (
              <Pressable accessibilityRole="button" accessibilityLabel="Show plates to load" onPress={() => setPlatesOpen(true)} style={styles.plates}>
                <Sub>Each side</Sub>
                <Text style={styles.lastText}>{load.belowBar ? `Under the ${fmtKg(barKg)} kg bar` : load.perSide.length ? platesLine(load.perSide) : 'Empty bar'}</Text>
              </Pressable>
            )}

            <View style={styles.tools}>
              <Ghost label="Warm-up" onPress={() => setWarmupOpen(true)} />
              <Ghost label="Add set" onPress={() => { addSet(w.id, item); setSel(item.sets.length); reload(); }} />
              <Ghost label="Swap" disabled={item.sets.some((s) => s.doneAt)} onPress={() => setSwapOpen(true)} />
              <Ghost label="Skip" disabled={isLast} onPress={() => move(w.position + 1)} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
          {set && (
            <View style={styles.steppers}>
              <View style={styles.stepper}>
                <RoundButton icon="minus" label="Less weight" size={44} onPress={() => changeWeight(Math.max(0, +(set.kg - item.incrementKg).toFixed(2)))} />
                <View style={styles.stepValue}><NumberField decimal label="Weight in kilograms" value={set.kg} format={fmtKg} onCommit={changeWeight} /><Text style={styles.rowUnit}>kg</Text></View>
                <RoundButton hot icon="plus" label="More weight" size={44} onPress={() => changeWeight(+(set.kg + item.incrementKg).toFixed(2))} />
              </View>
              <View style={styles.stepper}>
                <RoundButton icon="minus" label="Fewer reps" size={44} onPress={() => changeReps(Math.max(1, set.reps - 1))} />
                <View style={styles.stepValue}><NumberField label="Reps" value={set.reps} format={repsText} onCommit={changeReps} /><Text style={styles.rowUnit}>reps</Text></View>
                <RoundButton hot icon="plus" label="More reps" size={44} onPress={() => changeReps(set.reps + 1)} />
              </View>
            </View>
          )}
          {allDone ? (
            <HeatButton label={isLast ? 'FINISH WORKOUT' : 'NEXT EXERCISE'} onPress={isLast ? finish : () => move(w.position + 1)} />
          ) : set?.doneAt ? (
            <HeatButton label="NEXT SET" onPress={doneSet} />
          ) : (
            <HeatButton label={`DONE · SET ${selected + 1}`} onPress={doneSet} />
          )}
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={swapOpen} onClose={() => setSwapOpen(false)}>
        <H2>Swap {item.exercise}</H2>
        {swapOptions(sync.routine, w, item).map((o) => (
          <Pressable key={o.exercise} accessibilityRole="button" onPress={() => swapTo(o)} style={styles.pick}>
            <Text style={styles.pickName}>{o.exercise}</Text>
            <Sub>{o.muscle}</Sub>
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={platesOpen} onClose={() => setPlatesOpen(false)}>
        <H2>{fmtKg(workKg)} kg on the bar</H2>
        {load.belowBar ? (
          <Sub>That’s lighter than your {fmtKg(barKg)} kg bar. Change bar_kg in your sheet if you use a lighter one.</Sub>
        ) : (
          <>
            <PlateBar plates={load.perSide} />
            <Text style={styles.lastText}>{load.perSide.length ? `Each side: ${platesLine(load.perSide)}` : `Just the ${fmtKg(barKg)} kg bar`}</Text>
            {load.shortKg > 0 && <Sub>Your plates can’t make this exactly. This loads {fmtKg(workKg - load.shortKg)} kg.</Sub>}
          </>
        )}
      </Sheet>

      <Sheet visible={warmupOpen} onClose={() => setWarmupOpen(false)}>
        <H2>Warm-up for {fmtKg(workKg)} kg</H2>
        {warmups.length === 0 && <Sub>{workKg > 0 ? 'This weight is light enough to start straight away.' : 'Set your working weight first, then come back here.'}</Sub>}
        {warmups.map((l) => {
          const side = platesFor(l.kg, barKg, plates).perSide;
          return (
            <View key={l.kg} style={styles.pick}>
              <Text style={styles.pickName}>{fmtKg(l.kg)} kg × {l.reps}</Text>
              {barbell && <Sub>{side.length ? `Each side: ${platesLine(side)}` : 'Empty bar'}</Sub>}
            </View>
          );
        })}
      </Sheet>

      {rest && <RestOverlay rest={rest} onExtend={() => {
        const left = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000)) + 30;
        const next = { ...rest, endsAt: Date.now() + left * 1000, total: Math.max(rest.total, left) };
        setRest(next);
        setKv('rest', JSON.stringify(next));
        scheduleRestAlert(left, rest.label);
      }} onEnd={endRest} />}
      {celebrate && <Celebrate text={celebrate} onClose={() => {
        setCelebrate(null);
        const fresh = loadActiveWorkout();
        if (fresh) startRest(fresh);
      }} />}
    </Screen>
  );
}

function swapOptions(routine: ReturnType<typeof useSync>['routine'], w: Workout, item: WorkoutItem) {
  const used = new Set(w.items.map((i) => i.exercise));
  const muscle = routine.exercises.find((e) => e.name === item.exercise)?.muscle;
  const plans = routine.days.flatMap((d) => d.items);
  return routine.exercises
    .filter((e) => !used.has(e.name))
    .sort((a, b) => Number(b.muscle === muscle) - Number(a.muscle === muscle))
    .map((e) => {
      const plan = plans.find((p) => p.exercise === e.name);
      return { ...(plan ?? { exercise: e.name, sets: item.sets.length, repMin: item.repMin, repMax: item.repMax, restSec: item.restSec, incrementKg: item.incrementKg, superset: item.superset }), muscle: e.muscle };
    });
}

function RestOverlay({ rest, onExtend, onEnd }: { rest: Rest; onExtend: () => void; onEnd: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    // Android keeps JS running for a while after the screen locks. Ending rest from here
    // would cancel the notification before it fires, so leave that to the notification.
    if (rest.endsAt - now <= 0 && AppState.currentState === 'active') {
      Vibration.vibrate([0, 300, 120, 300]);
      onEnd();
    }
  }, [now, rest.endsAt, onEnd]);

  const size = Math.min(width - 80, 280);
  return (
    <View style={[styles.over, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.restEyebrow}>REST</Text>
      <View style={styles.center}>
        <View style={styles.ringBox}>
          <Ring size={size} stroke={16} fraction={left / rest.total} />
          <Text accessibilityRole="timer" style={styles.restTime}>{clock(left)}</Text>
        </View>
        <Sub style={{ fontSize: 15 }}>{rest.label}</Sub>
      </View>
      <View style={styles.pair}>
        <Ghost label="+30s" onPress={onExtend} style={styles.pairBtn} />
        <Ghost label="Skip" onPress={onEnd} style={styles.pairBtn} />
      </View>
    </View>
  );
}

const CONFETTI = ['#ffb020', '#ff5c35', '#ff2d78', '#ffffff', '#8f6bff'];

function Piece({ index, height, width, animate }: { index: number; height: number; width: number; animate: boolean }) {
  const fall = useRef(new Animated.Value(((index * 53) % 26) / 26)).current;
  useEffect(() => {
    if (!animate) return;
    const duration = 2000 + (index % 5) * 350;
    const loop = Animated.loop(Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    // The first drop starts part-way down, so every piece is on screen straight away.
    loop.start();
    return () => loop.stop();
  }, [animate, fall, index]);
  const size = 5 + (index * 7) % 8;
  return (
    <Animated.View
      style={{
        position: 'absolute', top: -20, left: ((index * 37) % 99) / 100 * width, width: size, height: size * 1.7, borderRadius: 2,
        backgroundColor: CONFETTI[index % 5],
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
        ],
      }}
    />
  );
}

function Celebrate({ text, onClose }: { text: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => setAnimate(!reduced));
  }, []);
  return (
    <View style={[styles.over, styles.celebrate, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      {Array.from({ length: 44 }, (_, i) => <Piece key={i} index={i} width={width} height={height} animate={animate} />)}
      <View style={styles.center}>
        <HotText style={styles.bigPr}>{'NEW\nPR'}</HotText>
        <Text style={styles.prWhat}>{text}</Text>
      </View>
      <HeatButton label="KEEP GOING" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  topTitle: { fontFamily: fonts.semibold },
  scroll: { paddingBottom: 16 },
  body: { padding: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pager: { flexDirection: 'row', gap: 6 },
  lastCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10 },
  lastText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 15, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: 'transparent' },
  rowNow: { backgroundColor: 'rgba(255,92,53,0.13)', borderColor: colors.coral },
  rowN: { width: 18, fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  rowValue: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  rowNum: { fontFamily: fonts.number, fontSize: 19, color: colors.text },
  rowUnit: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  pr: { alignSelf: 'center', marginLeft: 5, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.coral },
  prText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onHeat },
  chk: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line },
  chkOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  tools: { flexDirection: 'row', gap: 6 },
  superset: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: colors.link, marginTop: 4 },
  plates: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, backgroundColor: colors.glass },
  foot: { paddingHorizontal: 16, paddingTop: 11, gap: 10, backgroundColor: 'rgba(28,27,36,0.96)', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  steppers: { flexDirection: 'row', gap: 10 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { flex: 1, alignItems: 'center', minWidth: 0 },
  pick: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, backgroundColor: colors.glass },
  pickName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  over: { ...StyleSheet.absoluteFill, backgroundColor: colors.screen, paddingHorizontal: 16, zIndex: 5 },
  celebrate: { backgroundColor: '#0a0a0f', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  restEyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.3, color: colors.muted, textAlign: 'center' },
  ringBox: { alignItems: 'center', justifyContent: 'center' },
  restTime: { position: 'absolute', fontFamily: fonts.number, fontSize: 56, color: colors.text },
  pair: { flexDirection: 'row', gap: 10 },
  pairBtn: { flex: 1, paddingVertical: 15 },
  bigPr: { fontFamily: fonts.black, fontSize: 84, lineHeight: 88, textAlign: 'center', paddingHorizontal: 8 },
  prWhat: { fontFamily: fonts.number, fontSize: 18, color: colors.text, textAlign: 'center' },
});
