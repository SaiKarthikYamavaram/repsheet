import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow, Ghost, H2, HeatButton, Hint, HotText, Icon, Num, NumberField, RoundButton, Ring, Screen, Sheet, Sub, SyncPill } from '@/components/ui';
import { bodyweightSeries, lastLifts, loadActiveWorkout, loadStats, logBodyweight, startWorkout, volumeSince, Workout } from '@/lib/db';
import { addWeightHint, Day, fmtKg, fmtVolume, nextDayIndex, shortDate, weekStart, weekStreak } from '@/lib/logic';
import { requestRestAlerts } from '@/lib/rest-alert';
import { flushOutbox, syncAll, useSync } from '@/lib/sync';
import { colors, fonts, heat, heatEnd, heatStart } from '@/theme';

type Loaded = { active: Workout | null; finishedAt: number[]; lastOrder: number | null; record: string | null; volume: number; bw: number | null };

function load(): Loaded {
  const stats = loadStats();
  const r = stats.latestRecord;
  const series = bodyweightSeries(1);
  return {
    active: loadActiveWorkout(),
    finishedAt: stats.finishedAt,
    lastOrder: stats.lastOrder,
    record: r ? `${r.exercise} ${fmtKg(r.kg)} kg × ${r.reps}` : null,
    volume: volumeSince(weekStart(Date.now())),
    bw: series[0] ?? null,
  };
}

function findHint(day: Day) {
  for (const item of day.items) {
    const kg = addWeightHint(lastLifts(item.exercise), item.repMax, item.incrementKg);
    if (kg !== null) return { name: item.exercise, kg, reps: item.repMax };
  }
  return null;
}

export default function Today() {
  const sync = useSync();
  const [data, setData] = useState(load);
  const [picked, setPicked] = useState<number | null>(null);
  const [bwOpen, setBwOpen] = useState(false);
  const [bwDraft, setBwDraft] = useState(70);

  useFocusEffect(useCallback(() => {
    setData(load());
    setPicked(null);
  }, []));

  const { days, weeklyTarget } = sync.routine;
  const now = Date.now();
  const weekDone = data.finishedAt.filter((t) => t >= weekStart(now)).length;
  const dayIndex = Math.min(picked ?? nextDayIndex(days, data.lastOrder), days.length - 1);
  const day = days[dayIndex];
  const hint = data.active ? null : findHint(day);
  const doneSoFar = data.active ? data.active.items.flatMap((i) => i.sets).filter((s) => s.doneAt).length : 0;

  const go = () => {
    requestRestAlerts();
    if (!data.active) startWorkout(day);
    router.push('/workout');
  };
  const saveBw = () => {
    logBodyweight(bwDraft);
    flushOutbox();
    setBwOpen(false);
    setData(load());
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={sync.syncing} onRefresh={syncAll} tintColor={colors.coral} colors={[colors.coral]} progressBackgroundColor={colors.sheet} />}
      >
        <View style={styles.spread}>
          <Text style={styles.date}>{shortDate(now)}</Text>
          <SyncPill />
        </View>

        <Card style={styles.weekCard}>
          <Ring size={68} stroke={8} fraction={weekDone / weeklyTarget} />
          <View>
            <Num>{weekDone} of {weeklyTarget}</Num>
            <Sub>workouts this week</Sub>
          </View>
        </Card>

        <View style={styles.row}>
          <Card style={styles.half}>
            <HotText style={styles.bigNum}>{weekStreak(data.finishedAt, weeklyTarget, now)}</HotText>
            <Sub>week streak</Sub>
          </Card>
          <Card style={styles.half}>
            <Num>{fmtVolume(data.volume)}</Num>
            <Sub>lifted this week</Sub>
          </Card>
        </View>

        <Card style={styles.recordCard}>
          <Icon name="bolt" size={17} color={colors.link} />
          <Text style={styles.record}>{data.record ? <>Latest record: <Text style={styles.recordBold}>{data.record}</Text></> : 'Your records will show up here.'}</Text>
        </Card>

        {!data.active && (
          <View style={styles.cycle} accessibilityRole="tablist">
            {days.map((d, i) => (
              <Pressable key={d.order} accessibilityRole="tab" accessibilityState={{ selected: i === dayIndex }} onPress={() => setPicked(i)} style={[styles.chip, i === dayIndex && styles.chipOn]}>
                <Text numberOfLines={1} style={[styles.chipText, i === dayIndex && styles.chipTextOn]}>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <LinearGradient colors={heat} start={heatStart} end={heatEnd} style={styles.hero}>
          <View style={styles.heroArt}><Icon name="barbell" size={180} color="rgba(25,8,3,0.13)" /></View>
          <Eyebrow style={{ color: colors.onHeat }}>{data.active ? 'IN PROGRESS' : `NEXT UP · DAY ${dayIndex + 1} OF ${days.length}`}</Eyebrow>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.heroName}>{(data.active?.dayName ?? day.name).toUpperCase()}</Text>
          <Text style={styles.heroMeta}>{data.active ? `${doneSoFar} sets done so far` : `${day.items.length} exercises`}</Text>
          <Pressable accessibilityRole="button" onPress={go} style={({ pressed }) => [styles.go, pressed && { opacity: 0.8 }]}>
            <Icon name="play" size={13} solid color="#fff" />
            <Text style={styles.goText}>{data.active ? 'RESUME WORKOUT' : 'START WORKOUT'}</Text>
          </Pressable>
        </LinearGradient>

        {hint && <Hint title={`${hint.name}: try ${fmtKg(hint.kg)} kg`} detail={`You hit ${hint.reps} reps on every set`} />}

        <Pressable accessibilityRole="button" accessibilityLabel="Log bodyweight" onPress={() => { setBwDraft(data.bw ?? 70); setBwOpen(true); }} style={styles.bw}>
          <View>
            <Sub>Bodyweight</Sub>
            <Num style={{ fontSize: 18 }}>{data.bw === null ? 'Not logged' : `${fmtKg(data.bw)} kg`}</Num>
          </View>
          <View style={styles.bwAdd}><Icon name="plus" size={14} color={colors.link} /></View>
        </Pressable>
      </ScrollView>

      <Sheet visible={bwOpen} onClose={() => setBwOpen(false)}>
        <H2>Log bodyweight</H2>
        <View style={styles.bwStepper}>
          <RoundButton icon="minus" label="Less" size={56} onPress={() => setBwDraft((v) => +(v - 0.1).toFixed(1))} />
          <View style={{ alignItems: 'center' }}>
            <NumberField decimal label="Bodyweight in kilograms" value={bwDraft} format={fmtKg} onCommit={setBwDraft} style={{ fontSize: 38 }} />
            <Sub>kg</Sub>
          </View>
          <RoundButton hot icon="plus" label="More" size={56} onPress={() => setBwDraft((v) => +(v + 0.1).toFixed(1))} />
        </View>
        <HeatButton label="SAVE" onPress={saveBw} />
        <Ghost label="Cancel" onPress={() => setBwOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  date: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  weekCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  bigNum: { fontFamily: fonts.number, fontSize: 22 },
  recordCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  record: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  recordBold: { fontFamily: fonts.bold },
  cycle: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 99, backgroundColor: colors.glass },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 99 },
  chipOn: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  chipTextOn: { color: '#0c0c12' },
  hero: { borderRadius: 24, padding: 17, overflow: 'hidden' },
  heroArt: { position: 'absolute', right: -32, top: -10, transform: [{ rotate: '-24deg' }] },
  heroName: { fontFamily: fonts.black, fontSize: 60, lineHeight: 66, color: colors.onHeat, letterSpacing: -2, marginTop: 2, paddingRight: 8 },
  heroMeta: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onHeat },
  go: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15, padding: 15, borderRadius: 99, backgroundColor: '#0c0c12' },
  goText: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
  bw: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.glass, borderRadius: 18, padding: 14 },
  bwAdd: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass2 },
  bwStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
});
