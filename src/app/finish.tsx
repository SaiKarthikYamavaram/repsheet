import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow, H1, HeatButton, HotText, Icon, Num, Screen, Sub } from '@/components/ui';
import { FORM_URL } from '@/config';
import { loadWorkout } from '@/lib/db';
import { fmtKg, fmtVolume } from '@/lib/logic';
import { colors, fonts } from '@/theme';

export default function Finish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [w] = useState(() => loadWorkout(id));
  if (!w) return <Screen>{null}</Screen>;
  const lifts = w.items.flatMap((i) => i.sets.map((s) => ({ ...s, exercise: i.exercise })));
  const volume = lifts.reduce((sum, s) => sum + s.kg * s.reps, 0);
  const minutes = Math.max(1, Math.round(((w.finishedAt ?? Date.now()) - w.startedAt) / 60000));
  const records = lifts.filter((s) => s.isRecord);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <H1 style={styles.title}>Workout</H1>
          <HotText style={styles.title}>done</HotText>
        </View>
        <Sub style={{ fontSize: 15 }}>{w.dayName} · {minutes} min</Sub>
        <View style={styles.row}>
          <Card style={{ flex: 1 }}><Num>{lifts.length}</Num><Sub>{lifts.length === 1 ? 'set' : 'sets'}</Sub></Card>
          <Card style={{ flex: 1 }}><Num>{fmtVolume(volume)}</Num><Sub>lifted</Sub></Card>
        </View>
        {records.length > 0 ? (
          <Card style={{ gap: 10 }}>
            <Eyebrow>NEW RECORDS</Eyebrow>
            {records.map((r) => (
              <View key={r.id} style={styles.record}>
                <Icon name="bolt" size={17} color={colors.link} />
                <Text style={styles.recordText}>{r.exercise} {fmtKg(r.kg)} kg × {r.reps}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card><Sub>No new records today. Consistency still counts.</Sub></Card>
        )}
        <Sub>{FORM_URL ? 'Your sets are saved and will back up to your sheet.' : 'Your sets are saved on this phone.'}</Sub>
      </ScrollView>
      <View style={styles.foot}><HeatButton label="CLOSE" onPress={() => router.replace('/')} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 28, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 46, lineHeight: 52, paddingRight: 6, color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  recordText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  foot: { paddingHorizontal: 16, paddingBottom: 14 },
});
