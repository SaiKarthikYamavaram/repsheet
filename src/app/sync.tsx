import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Eyebrow, Ghost, H1, HeatButton, Icon, RoundButton, Screen, Sub } from '@/components/ui';
import { FORM_URL, SHEET_ID } from '@/config';
import { installedVersion, newAppInfo } from '@/lib/app-version';
import { shortDate, timeAgo } from '@/lib/logic';
import { getPerson, setPerson, syncAll, useSync } from '@/lib/sync';
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

type UpdateStep = 'idle' | 'checking' | 'downloading' | 'ready' | 'latest' | 'failed';

const UPDATE_TEXT: Record<UpdateStep, string> = {
  idle: 'Check for the latest improvements.',
  checking: 'Checking…',
  downloading: 'Downloading the update…',
  ready: 'Update ready. Restarting keeps your workout and logs.',
  latest: 'You’re on the latest update.',
  failed: 'Couldn’t check for updates. Check your connection, then try again.',
};

function AppUpdates() {
  const { routine } = useSync();
  const [step, setStep] = useState<UpdateStep>('idle');
  const newApp = newAppInfo(routine);
  const busy = step === 'checking' || step === 'downloading';

  const check = async () => {
    setStep('checking');
    try {
      const found = await Updates.checkForUpdateAsync();
      if (!found.isAvailable) {
        setStep('latest');
        return;
      }
      setStep('downloading');
      await Updates.fetchUpdateAsync();
      setStep('ready');
    } catch {
      setStep('failed');
    }
  };
  const restart = () => {
    Updates.reloadAsync().catch(() => setStep('failed'));
  };

  return (
    <>
      <Eyebrow style={styles.section}>APP</Eyebrow>
      <Card style={{ gap: 3 }}>
        <Text style={styles.title}>Version {installedVersion()}</Text>
        <Sub>{Updates.createdAt && !Updates.isEmbeddedLaunch ? `Updated ${shortDate(Updates.createdAt.getTime())}. ` : ''}{UPDATE_TEXT[step]}</Sub>
      </Card>
      {step === 'ready'
        ? <HeatButton label="RESTART TO UPDATE" onPress={restart} />
        : <Ghost label={busy ? 'Please wait…' : 'Check for updates'} disabled={busy} style={{ paddingVertical: 13 }} onPress={check} />}
      {newApp.needed && (
        <>
          <Status title="New app version available" detail={newApp.url ? 'This one needs a fresh install. Installing over the top keeps your logs.' : 'This one needs a fresh install. Ask for the latest install link.'} problem />
          {newApp.url !== '' && <HeatButton label="DOWNLOAD NEW VERSION" onPress={() => Linking.openURL(newApp.url)} />}
        </>
      )}
    </>
  );
}

export default function Sync() {
  const s = useSync();
  const [person, setDraft] = useState(getPerson);
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <H1>Sync and updates</H1>
        <Status title="Routine sheet" detail={routineDetail} problem={!!s.sheetError} off={!SHEET_ID} />
        <Status title="Log backup" detail={backupDetail} problem={!!s.backupError} off={!FORM_URL} />
        <HeatButton label={s.syncing ? 'REFRESHING…' : 'REFRESH NOW'} onPress={syncAll} />
        <View style={{ gap: 6 }}>
          <Eyebrow>YOUR NAME</Eyebrow>
          <TextInput
            accessibilityLabel="Your name"
            value={person}
            maxLength={40}
            autoCapitalize="words"
            onChangeText={(t) => { setDraft(t); setPerson(t); }}
            placeholder="Labels your rows in the backup sheet"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <Sub>Being offline in the gym is fine. Sets wait on your phone and send when you’re back online.</Sub>
        <AppUpdates />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 16, paddingTop: 4, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  section: { marginTop: 10 },
  input: { borderRadius: 16, padding: 13, backgroundColor: colors.glass, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
});
