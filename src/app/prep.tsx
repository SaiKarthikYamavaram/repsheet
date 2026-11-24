import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { H1, HeatButton, Icon, RoundButton, Screen, Sub } from '@/components/ui';
import { loadWorkout } from '@/lib/db';
import { clock, Phase, prepFor } from '@/lib/logic';
import { useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

type Timer = { index: number; side: number; endsAt: number };

const COPY: Record<Phase, { title: string; rule: string; next: string }> = {
  warmup: { title: 'Warm-up', rule: 'Keep moving, no long holds. Still stiff? Add more before going heavy.', next: 'START LIFTING' },
  cooldown: { title: 'Cool-down', rule: 'Hold each stretch and breathe out into it. Discomfort is fine, sharp pain is not.', next: 'FINISH' },
};

// The warm-up before a workout and the cool-down after it. Ticks aren't logged, they just keep your place.
export default function Prep() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { phase, id } = useLocalSearchParams<{ phase: Phase; id: string }>();
  const { routine } = useSync();
  const [workout] = useState(() => loadWorkout(id));
  const [done, setDone] = useState<boolean[]>([]);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(Date.now);
  const items = workout ? prepFor(routine.prep, workout.dayName, phase) : [];
  const copy = COPY[phase] ?? COPY.warmup;

  useEffect(() => {
    if (!timer) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [timer]);

  // Each side gets its own hold, with a buzz to switch, then the move ticks itself.
  useEffect(() => {
    if (!timer || now < timer.endsAt) return;
    const item = items[timer.index];
    if (item && timer.side < item.sides) {
      Vibration.vibrate([0, 200, 100, 200]);
      setTimer({ ...timer, side: timer.side + 1, endsAt: Date.now() + item.seconds * 1000 });
    } else {
      Vibration.vibrate([0, 300, 120, 300]);
      setDone((d) => Object.assign([...d], { [timer.index]: true }));
      setTimer(null);
    }
  }, [now, timer, items]);

  const toggle = (i: number) => setDone((d) => Object.assign([...d], { [i]: !d[i] }));
  const startTimer = (i: number) => {
    if (timer?.index === i) { setTimer(null); return; }
    setNow(Date.now());
    setTimer({ index: i, side: 1, endsAt: Date.now() + items[i].seconds * 1000 });
  };
  const next = () => (phase === 'cooldown' ? router.replace({ pathname: '/finish', params: { id } }) : router.replace('/workout'));
  const count = items.filter((_, i) => done[i]).length;

  return (
    <Screen>
      <View style={styles.top}>
        <RoundButton icon="back" label="Back to Today" onPress={() => router.back()} />
        <Sub style={styles.topTitle}>{workout?.dayName} · {count} of {items.length} done</Sub>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <H1>{copy.title}</H1>
        <Sub>{copy.rule}</Sub>
        {items.map((item, i) => {
          const running = timer?.index === i ? timer : null;
          const left = running ? Math.max(0, Math.ceil((running.endsAt - now) / 1000)) : item.seconds;
          return (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: !!done[i] }} onPress={() => toggle(i)} style={[styles.row, running && styles.rowNow]}>
              <View style={[styles.chk, done[i] && styles.chkOn]}>{done[i] && <Icon name="check" size={15} color={colors.onHeat} />}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.amount !== '' && <Text style={styles.amount}>{item.amount}</Text>}
                {item.how !== '' && <Sub>{item.how}</Sub>}
              </View>
              {item.seconds > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={running ? `Stop timer, ${left} seconds left` : `Start ${item.seconds} second timer`}
                  onPress={() => startTimer(i)}
                  hitSlop={6}
                  style={[styles.timer, running && styles.timerOn]}
                >
                  <Icon name={running ? 'clock' : 'play'} size={12} solid={!running} color={running ? colors.onHeat : colors.text} />
                  <Text style={[styles.timerText, running && { color: colors.onHeat }]}>{clock(left)}</Text>
                  {item.sides > 1 && <Text style={[styles.side, running && { color: colors.onHeat }]}>{running ? `side ${running.side}/${item.sides}` : `×${item.sides}`}</Text>}
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
        <HeatButton label={copy.next} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  topTitle: { fontFamily: fonts.semibold },
  content: { padding: 16, paddingTop: 4, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 15, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: 'transparent' },
  rowNow: { backgroundColor: 'rgba(255,92,53,0.13)', borderColor: colors.coral },
  chk: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line },
  chkOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  amount: { fontFamily: fonts.bold, fontSize: 13, color: colors.link },
  timer: { alignItems: 'center', gap: 3, minWidth: 64, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.glass2 },
  timerOn: { backgroundColor: colors.coral },
  timerText: { fontFamily: fonts.number, fontSize: 15, color: colors.text },
  side: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  foot: { paddingHorizontal: 16, paddingTop: 11, backgroundColor: 'rgba(28,27,36,0.96)', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
});
