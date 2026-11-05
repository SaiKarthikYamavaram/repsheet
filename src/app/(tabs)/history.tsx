import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H1, Screen, Sub, SyncPill } from '@/components/ui';
import { loadHistory, Workout } from '@/lib/db';
import { fmtVolume, liftsLine, shortDate } from '@/lib/logic';
import { colors, fonts } from '@/theme';

function Session({ w, open, onToggle }: { w: Workout; open: boolean; onToggle: () => void }) {
  const items = w.items.filter((i) => i.sets.length);
  const sets = items.flatMap((i) => i.sets);
  const volume = sets.reduce((sum, s) => sum + s.kg * s.reps, 0);
  const minutes = Math.max(1, Math.round(((w.finishedAt ?? 0) - w.startedAt) / 60000));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.card}>
      <View style={styles.spread}>
        <Text style={styles.day}>{w.dayName}</Text>
        <Sub>{shortDate(w.finishedAt ?? w.startedAt)}</Sub>
      </View>
      <View style={styles.meta}>
        <Sub>{minutes} min · {sets.length} {sets.length === 1 ? 'set' : 'sets'} · {fmtVolume(volume)}</Sub>
        {sets.some((s) => s.isRecord) && <View style={styles.pr}><Text style={styles.prText}>PR</Text></View>}
      </View>
      {open && (
        <View style={styles.lines}>
          {items.map((i) => (
            <Text key={i.position} style={styles.line}>{i.exercise} {liftsLine(i.sets)}</Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function History() {
  const [sessions, setSessions] = useState(() => loadHistory());
  const [open, setOpen] = useState<string | null>(null);
  useFocusEffect(useCallback(() => setSessions(loadHistory()), []));
  return (
    <Screen>
      <FlatList
        data={sessions}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.spread}><H1>History</H1><SyncPill /></View>}
        ListEmptyComponent={<Card><Sub>Finished workouts show up here. Start one from the Today tab.</Sub></Card>}
        ListFooterComponent={sessions.length ? <Sub style={{ textAlign: 'center' }}>Tap a workout to see its sets.</Sub> : undefined}
        renderItem={({ item }) => <Session w={item} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.glass, borderRadius: 18, padding: 14, gap: 3 },
  day: { fontFamily: fonts.number, fontSize: 18, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pr: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.coral },
  prText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onHeat },
  lines: { gap: 5, marginTop: 8 },
  line: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
});
