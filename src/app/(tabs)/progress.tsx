import { ObserveInteractiveMarker } from 'expo-observe';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { LogValueSheet } from '@/components/log-value-sheet';
import { Card, Eyebrow, Ghost, H1, H2, HeatButton, Icon, Screen, Sheet, Sub, SyncPill } from '@/components/ui';
import { bestFinished, bodyweightSeries, loggedExercises, logBodyweight, logMeasurement, measurementSeries, topSetSeries } from '@/lib/db';
import { fmtKg, Lift } from '@/lib/logic';
import { flushOutbox, useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

const BODYWEIGHT = 'Bodyweight';
const MEASUREMENTS = ['Chest', 'Waist', 'Hips', 'Arm', 'Thigh', 'Calf'];

function load(selected: string): { points: number[]; best: Lift | null; logged: string[] } {
  const isBody = selected === BODYWEIGHT;
  const isMeasure = MEASUREMENTS.includes(selected);
  return {
    points: isBody ? bodyweightSeries() : isMeasure ? measurementSeries(selected) : topSetSeries(selected),
    best: isBody || isMeasure ? null : bestFinished(selected),
    logged: loggedExercises(),
  };
}

export default function Progress() {
  const { routine } = useSync();
  const [selected, setSelected] = useState(routine.days[0].items[0].exercise);
  const [data, setData] = useState(() => load(selected));
  const [open, setOpen] = useState(false);
  const [logging, setLogging] = useState(false);

  useFocusEffect(useCallback(() => setData(load(selected)), [selected]));

  const isBody = selected === BODYWEIGHT;
  const isMeasure = MEASUREMENTS.includes(selected);
  const isExercise = !isBody && !isMeasure;
  const unit = isMeasure ? 'cm' : 'kg';
  const lifts = [...new Set([...routine.days.flatMap((d) => d.items.map((i) => i.exercise)), ...data.logged])];
  const { points, best } = data;
  const now = points[points.length - 1];
  const delta = points.length > 1 ? +(now - points[0]).toFixed(1) : 0;
  const span = isExercise ? 'sessions' : 'entries';

  const save = (value: number) => {
    if (isBody) logBodyweight(value);
    else logMeasurement(selected, value);
    flushOutbox();
    setLogging(false);
    setData(load(selected));
  };
  const pick = (option: string) => {
    setSelected(option);
    setData(load(option));
    setOpen(false);
  };
  const option = (o: string) => (
    <Pressable key={o} accessibilityRole="button" onPress={() => pick(o)} style={[styles.option, o === selected && styles.optionOn]}>
      <Text style={styles.optionText}>{o}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <ObserveInteractiveMarker />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.spread}><H1>Progress</H1><SyncPill /></View>
        <Eyebrow>SHOWING</Eyebrow>
        <Pressable accessibilityRole="button" accessibilityLabel={`Showing ${selected}. Change`} onPress={() => setOpen(true)} style={styles.select}>
          <Text style={styles.selectText}>{selected}</Text>
          <Icon name="down" />
        </Pressable>

        <Card style={{ gap: 10 }}>
          <Eyebrow>{isExercise ? 'TOP SET WEIGHT' : selected.toUpperCase()}</Eyebrow>
          {points.length ? (
            <>
              <View style={styles.bigRow}><Text style={styles.big}>{fmtKg(now)}</Text><Sub>{unit}</Sub></View>
              {points.length > 1 ? (
                <>
                  <Sub>{delta === 0 ? `No change over the last ${points.length} ${span}` : `${delta > 0 ? '+' : ''}${fmtKg(delta)} ${unit} over the last ${points.length} ${span}`}</Sub>
                  <LineChart points={points} unit={unit} />
                </>
              ) : (
                <Sub>Log this once more to start your chart.</Sub>
              )}
            </>
          ) : (
            <Sub>{isExercise ? `Finish a workout with ${selected} to start this chart.` : `Log your first ${selected.toLowerCase()} measurement to start this chart.`}</Sub>
          )}
        </Card>

        {isExercise && best && (
          <Card style={styles.spread}><Sub>Best set</Sub><Text style={styles.best}>{fmtKg(best.kg)} kg × {best.reps}</Text></Card>
        )}
        {isExercise && <Ghost label="Open exercise and video" style={{ paddingVertical: 13 }} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: selected } })} />}
        {!isExercise && <HeatButton label={`LOG ${selected.toUpperCase()}`} onPress={() => setLogging(true)} />}
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <H2>Show progress for</H2>
        <Eyebrow>BODY</Eyebrow>
        {[BODYWEIGHT, ...MEASUREMENTS].map(option)}
        <Eyebrow style={{ marginTop: 6 }}>LIFTS</Eyebrow>
        {lifts.map(option)}
      </Sheet>

      <LogValueSheet visible={logging} title={`Log ${selected.toLowerCase()}`} unit={unit} start={now ?? (isBody ? 70 : 40)} step={isBody ? 0.1 : 0.5} onClose={() => setLogging(false)} onSave={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: colors.glass2 },
  selectText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  big: { fontFamily: fonts.number, fontSize: 50, lineHeight: 58, color: colors.text },
  best: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  option: { padding: 13, borderRadius: 14, backgroundColor: colors.glass },
  optionOn: { backgroundColor: 'rgba(255,92,53,0.2)' },
  optionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
