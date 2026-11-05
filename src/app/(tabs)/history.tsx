import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Ghost, H1, RoundButton, Screen, Sub, SyncPill } from '@/components/ui';
import { loadHistory, Workout } from '@/lib/db';
import { dayKey, fmtVolume, liftsLine, monthGrid, MONTHS, shortDate } from '@/lib/logic';
import { colors, fonts } from '@/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Calendar({ sessions, selected, onSelect }: { sessions: Workout[]; selected: string | null; onSelect: (day: string | null) => void }) {
  const today = new Date();
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const trained = new Map<string, number>();
  sessions.forEach((w) => {
    const key = dayKey(w.finishedAt ?? w.startedAt);
    trained.set(key, (trained.get(key) ?? 0) + 1);
  });
  const move = (by: number) => {
    const d = new Date(shown.year, shown.month + by, 1);
    setShown({ year: d.getFullYear(), month: d.getMonth() });
  };
  const atCurrentMonth = shown.year === today.getFullYear() && shown.month === today.getMonth();
  const inMonth = sessions.filter((w) => {
    const d = new Date(w.finishedAt ?? w.startedAt);
    return d.getFullYear() === shown.year && d.getMonth() === shown.month;
  }).length;

  return (
    <Card style={styles.calendar}>
      <View style={styles.spread}>
        <RoundButton icon="back" label="Previous month" size={36} onPress={() => move(-1)} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.month}>{MONTHS[shown.month]} {shown.year}</Text>
          <Sub>{inMonth} {inMonth === 1 ? 'workout' : 'workouts'}</Sub>
        </View>
        <RoundButton icon="next" label="Next month" size={36} disabled={atCurrentMonth} onPress={() => move(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => <Text key={i} style={styles.weekday}>{d}</Text>)}
      </View>
      {monthGrid(shown.year, shown.month).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const key = dayKey(new Date(shown.year, shown.month, day).getTime());
            const count = trained.get(key) ?? 0;
            const isToday = key === dayKey(today.getTime());
            const isSelected = key === selected;
            return (
              <View key={i} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !count, selected: isSelected }}
                  accessibilityLabel={`${day} ${MONTHS[shown.month]}, ${count ? `${count} ${count === 1 ? 'workout' : 'workouts'}` : 'no workout'}`}
                  disabled={!count}
                  onPress={() => onSelect(isSelected ? null : key)}
                  style={[styles.day, !!count && styles.dayTrained, isToday && styles.dayToday, isSelected && styles.daySelected]}
                >
                  <Text style={[styles.dayText, !count && !isToday && styles.dayEmpty, isSelected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

function Session({ w, open, onToggle }: { w: Workout; open: boolean; onToggle: () => void }) {
  const items = w.items.filter((i) => i.sets.length);
  const sets = items.flatMap((i) => i.sets);
  const volume = sets.reduce((sum, s) => sum + s.kg * s.reps, 0);
  const minutes = Math.max(1, Math.round(((w.finishedAt ?? 0) - w.startedAt) / 60000));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.card}>
      <View style={styles.spread}>
        <Text style={styles.dayName}>{w.dayName}</Text>
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

// ponytail: loads up to 1000 full sessions on focus, page the list if this ever feels slow.
const load = () => loadHistory(1000);

export default function History() {
  const [sessions, setSessions] = useState(load);
  const [open, setOpen] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  useFocusEffect(useCallback(() => setSessions(load()), []));
  const shown = day ? sessions.filter((w) => dayKey(w.finishedAt ?? w.startedAt) === day) : sessions;
  return (
    <Screen>
      <FlatList
        data={shown}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <View style={styles.spread}><H1>History</H1><SyncPill /></View>
            <Calendar sessions={sessions} selected={day} onSelect={setDay} />
            {day && <Ghost label="Show all workouts" onPress={() => setDay(null)} />}
          </View>
        }
        ListEmptyComponent={<Card><Sub>Finished workouts show up here. Start one from the Today tab.</Sub></Card>}
        ListFooterComponent={shown.length ? <Sub style={{ textAlign: 'center' }}>Tap a workout to see its sets.</Sub> : undefined}
        renderItem={({ item }) => <Session w={item} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  calendar: { gap: 4 },
  month: { fontFamily: fonts.number, fontSize: 15, color: colors.text },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, paddingTop: 8, paddingBottom: 2 },
  cell: { flex: 1, aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  dayTrained: { backgroundColor: 'rgba(255,92,53,0.3)' },
  dayToday: { borderWidth: 1.5, borderColor: colors.text },
  daySelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  dayText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  dayEmpty: { color: colors.muted },
  dayTextSelected: { color: colors.onHeat },
  card: { backgroundColor: colors.glass, borderRadius: 18, padding: 14, gap: 3 },
  dayName: { fontFamily: fonts.number, fontSize: 18, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pr: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.coral },
  prText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onHeat },
  lines: { gap: 5, marginTop: 8 },
  line: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
});
