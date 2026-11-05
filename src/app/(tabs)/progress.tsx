import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { Card, Eyebrow, Ghost, H1, H2, Icon, Screen, Sheet, Sub, SyncPill } from '@/components/ui';
import { bestFinished, bodyweightSeries, loggedExercises, topSetSeries } from '@/lib/db';
import { fmtKg, Lift } from '@/lib/logic';
import { useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

const BODYWEIGHT = 'Bodyweight';

function load(selected: string): { points: number[]; best: Lift | null; logged: string[] } {
  const isBw = selected === BODYWEIGHT;
  return {
    points: isBw ? bodyweightSeries() : topSetSeries(selected),
    best: isBw ? null : bestFinished(selected),
    logged: loggedExercises(),
  };
}

export default function Progress() {
  const { routine } = useSync();
  const [selected, setSelected] = useState(routine.days[0].items[0].exercise);
  const [data, setData] = useState(() => load(selected));
  const [open, setOpen] = useState(false);

  useFocusEffect(useCallback(() => setData(load(selected)), [selected]));

  const isBw = selected === BODYWEIGHT;
  const options = [BODYWEIGHT, ...new Set([...routine.days.flatMap((d) => d.items.map((i) => i.exercise)), ...data.logged])];
  const { points, best } = data;
  const now = points[points.length - 1];
  const delta = points.length > 1 ? +(now - points[0]).toFixed(1) : 0;
  const unit = isBw ? 'entries' : 'sessions';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.spread}><H1>Progress</H1><SyncPill /></View>
        <Eyebrow>SHOWING</Eyebrow>
        <Pressable accessibilityRole="button" accessibilityLabel={`Showing ${selected}. Change`} onPress={() => setOpen(true)} style={styles.select}>
          <Text style={styles.selectText}>{selected}</Text>
          <Icon name="down" />
        </Pressable>

        <Card style={{ gap: 10 }}>
          <Eyebrow>{isBw ? 'BODYWEIGHT' : 'TOP SET WEIGHT'}</Eyebrow>
          {points.length ? (
            <>
              <View style={styles.bigRow}><Text style={styles.big}>{fmtKg(now)}</Text><Sub>kg</Sub></View>
              {points.length > 1 ? (
                <>
                  <Sub>{delta === 0 ? `No change over the last ${points.length} ${unit}` : `${delta > 0 ? '+' : ''}${fmtKg(delta)} kg over the last ${points.length} ${unit}`}</Sub>
                  <LineChart points={points} />
                </>
              ) : (
                <Sub>Log this once more to start your chart.</Sub>
              )}
            </>
          ) : (
            <Sub>{isBw ? 'Log your bodyweight on the Today tab to start this chart.' : `Finish a workout with ${selected} to start this chart.`}</Sub>
          )}
        </Card>

        {!isBw && best && (
          <Card style={styles.spread}><Sub>Best set</Sub><Text style={styles.best}>{fmtKg(best.kg)} kg × {best.reps}</Text></Card>
        )}
        {!isBw && <Ghost label="Open exercise and video" style={{ paddingVertical: 13 }} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: selected } })} />}
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <H2>Show progress for</H2>
        {options.map((o) => (
          <Pressable key={o} accessibilityRole="button" onPress={() => { setSelected(o); setData(load(o)); setOpen(false); }} style={[styles.option, o === selected && styles.optionOn]}>
            <Text style={styles.optionText}>{o}</Text>
          </Pressable>
        ))}
      </Sheet>
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
