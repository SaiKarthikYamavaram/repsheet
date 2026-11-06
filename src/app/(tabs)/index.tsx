import { LinearGradient } from 'expo-linear-gradient';
import { useObserve } from 'expo-observe';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogValueSheet } from '@/components/log-value-sheet';
import { Card, Eyebrow, Hint, HotText, Icon, Num, Ring, Screen, Sub, SyncPill } from '@/components/ui';
import { FORM_URL } from '@/config';
import { newAppInfo } from '@/lib/app-version';
import { bodyweightSeries, getKv, lastLifts, loadActiveWorkout, loadStats, logBodyweight, measurementSeries, setKv, startWorkout, volumeSince, Workout } from '@/lib/db';
import { addWeightHint, bmi, Day, fmtKg, fmtVolume, nextDayIndex, shortDate, weekStart, weekStreak } from '@/lib/logic';
import { requestRestAlerts } from '@/lib/rest-alert';
import { flushOutbox, getPerson, syncAll, useSync } from '@/lib/sync';
import { colors, fonts, heat, heatEnd, heatStart } from '@/theme';

type Loaded = { active: Workout | null; finishedAt: number[]; lastOrder: number | null; record: string | null; volume: number; bw: number | null; waist: number | null };

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
    waist: measurementSeries('Waist', 1)[0] ?? null,
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
  const { markInteractive } = useObserve();
  const [data, setData] = useState(load);
  const [picked, setPicked] = useState<number | null>(null);
  const [bwOpen, setBwOpen] = useState(false);
  const [heightOpen, setHeightOpen] = useState(false);
  const [heightCm, setHeightCm] = useState(() => Number(getKv('height_cm')) || null);

  useFocusEffect(useCallback(() => {
    setData(load());
    setPicked(null);
  }, []));

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const { days, weeklyTarget } = sync.routine;
  const now = Date.now();
  const weekDone = data.finishedAt.filter((t) => t >= weekStart(now)).length;
  const dayIndex = Math.min(picked ?? nextDayIndex(days, data.lastOrder), days.length - 1);
  const day = days[dayIndex];
  const hint = data.active ? null : findHint(day);
  const doneSoFar = data.active ? data.active.items.flatMap((i) => i.sets).filter((s) => s.doneAt).length : 0;

  const newApp = newAppInfo(sync.routine);
  const person = getPerson();

  const go = () => {
    requestRestAlerts();
    if (!data.active) startWorkout(day);
    router.push('/workout');
  };
  const saveBw = (kg: number) => {
    logBodyweight(kg);
    flushOutbox();
    setBwOpen(false);
    setData(load());
  };
  const saveHeight = (cm: number) => {
    if (cm > 0) {
      setKv('height_cm', String(cm));
      setHeightCm(cm);
    }
    setHeightOpen(false);
  };
  const b = data.bw !== null && heightCm ? bmi(data.bw, heightCm) : null;
  // Under 0.5 is the usual healthy line, and unlike BMI it isn't fooled by muscle.
  const whtr = data.waist !== null && heightCm ? +(data.waist / heightCm).toFixed(2) : null;

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

        {!!FORM_URL && !person && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/sync')}>
            <Hint title="Add your name" detail="It labels your rows in the backup sheet." />
          </Pressable>
        )}

        {newApp.needed && (
          <Pressable accessibilityRole={newApp.url ? 'link' : undefined} disabled={!newApp.url} onPress={() => Linking.openURL(newApp.url)}>
            <Hint title="New version available" detail={newApp.url ? 'Tap to download and install it.' : 'Ask for the latest install link.'} />
          </Pressable>
        )}

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

        <Pressable accessibilityRole="button" accessibilityLabel="Log bodyweight" onPress={() => setBwOpen(true)} style={styles.bw}>
          <View>
            <Sub>Bodyweight</Sub>
            <Num style={{ fontSize: 18 }}>{data.bw === null ? 'Not logged' : `${fmtKg(data.bw)} kg`}</Num>
            <Pressable accessibilityRole="button" accessibilityLabel={heightCm ? `Height ${heightCm} cm. Change height` : 'Add height for BMI'} onPress={() => setHeightOpen(true)} hitSlop={8}>
              {b ? (
                <Text style={styles.bmi}>BMI {b.value} · <Text style={{ color: b.label === 'Healthy' ? colors.ok : colors.amber }}>{b.label}</Text></Text>
              ) : (
                <Text style={[styles.bmi, { color: colors.link }]}>{heightCm ? `Height ${heightCm} cm` : 'Add height for BMI'}</Text>
              )}
            </Pressable>
            {whtr !== null && (
              <Text style={styles.bmi}>Waist ÷ height {whtr} · <Text style={{ color: whtr < 0.5 ? colors.ok : colors.amber }}>{whtr < 0.5 ? 'Healthy' : 'High'}</Text></Text>
            )}
          </View>
          <View style={styles.bwAdd}><Icon name="plus" size={14} color={colors.link} /></View>
        </Pressable>
      </ScrollView>

      <LogValueSheet visible={heightOpen} title="Your height" unit="cm" start={heightCm ?? 170} step={1} onClose={() => setHeightOpen(false)} onSave={saveHeight} />
      <LogValueSheet visible={bwOpen} title="Log bodyweight" unit="kg" start={data.bw ?? 70} step={0.1} onClose={() => setBwOpen(false)} onSave={saveBw} />
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
  bmi: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, marginTop: 3 },
  bwAdd: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass2 },
});
