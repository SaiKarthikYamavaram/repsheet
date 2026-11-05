import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormVideo } from '@/components/form-video';
import { Body, Card, Eyebrow, H1, RoundButton, Screen, Sub } from '@/components/ui';
import { bestFinished, getNote, lastLifts, setNote } from '@/lib/db';
import { fmtKg, liftsLine } from '@/lib/logic';
import { useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

export default function ExerciseScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { routine } = useSync();
  const info = routine.exercises.find((e) => e.name === name);
  const [note, setDraft] = useState(() => getNote(name));
  const [last] = useState(() => lastLifts(name));
  const [best] = useState(() => bestFinished(name));
  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.top}>
          <RoundButton icon="back" label="Back" onPress={() => router.back()} />
          <Sub style={{ fontFamily: fonts.semibold }}>{info?.muscle ?? ''}</Sub>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <FormVideo rounded url={info?.videoUrl ?? ''} />
          <H1>{name}</H1>
          {info?.cues ? <Card><Eyebrow>FORM CUE</Eyebrow><Body style={{ marginTop: 4 }}>{info.cues}</Body></Card> : null}
          {last.length > 0 && <Card style={styles.spread}><Sub>Last time</Sub><Text style={styles.value}>{liftsLine(last)}</Text></Card>}
          {best && <Card style={styles.spread}><Sub>Best set</Sub><Text style={styles.value}>{fmtKg(best.kg)} kg × {best.reps}</Text></Card>}
          <View style={{ gap: 6 }}>
            <Eyebrow>YOUR NOTE</Eyebrow>
            <TextInput
              accessibilityLabel="Your note"
              multiline
              value={note}
              onChangeText={(t) => { setDraft(t); setNote(name, t); }}
              placeholder="Seat height, grip, machine number…"
              placeholderTextColor={colors.muted}
              style={styles.note}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 16, paddingTop: 4, gap: 14 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  value: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  note: { minHeight: 90, borderRadius: 16, padding: 13, backgroundColor: colors.glass, color: colors.text, fontFamily: fonts.body, fontSize: 16, textAlignVertical: 'top' },
});
