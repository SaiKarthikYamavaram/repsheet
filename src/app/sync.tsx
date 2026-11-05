import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H1, HeatButton, Icon, RoundButton, Screen, Sub } from '@/components/ui';
import { FORM_URL, SHEET_ID } from '@/config';
import { timeAgo } from '@/lib/logic';
import { syncAll, useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

function Status({ title, detail, problem, off }: { title: string; detail: string; problem?: boolean; off?: boolean }) {
  return (
    <Card style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Sub>{detail}</Sub>
      </View>
      {!off && <Icon name={problem ? 'warn' : 'check'} size={20} color={problem ? colors.amber : colors.ok} />}
    </Card>
  );
}

export default function Sync() {
  const s = useSync();
  const routineDetail = !SHEET_ID
    ? 'Using the starter routine. Add your sheet to change it. See the README.'
    : s.sheetError
      ? `${s.sheetError} Using your last good routine.`
      : s.fetchedAt
        ? `Updated ${timeAgo(s.fetchedAt, Date.now())}`
        : 'Not read yet. Check your connection, then refresh.';
  const backupDetail = !FORM_URL
    ? 'Not set up, so logs stay on this phone only.'
    : s.backupError
      ? `${s.backupError} ${s.waiting} waiting.`
      : s.waiting
        ? `${s.waiting} waiting. They’ll send when you’re back online.`
        : 'Everything is backed up.';
  return (
    <Screen>
      <View style={styles.top}><RoundButton icon="back" label="Back" onPress={() => router.back()} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <H1>Sheet sync</H1>
        <Status title="Routine sheet" detail={routineDetail} problem={!!s.sheetError} off={!SHEET_ID} />
        <Status title="Log backup" detail={backupDetail} problem={!!s.backupError} off={!FORM_URL} />
        <HeatButton label={s.syncing ? 'REFRESHING…' : 'REFRESH NOW'} onPress={syncAll} />
        <Sub>Being offline in the gym is fine. Sets wait on your phone and send when you’re back online.</Sub>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 16, paddingTop: 4, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
