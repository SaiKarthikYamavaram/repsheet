import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CameraHandle, CameraMessage, PoseCamera } from '@/components/pose-camera';
import { Body, Card, Eyebrow, Ghost, H2, RoundButton, Screen, Sub } from '@/components/ui';
import { Rep, repCounter, ruleFor, setSummary } from '@/lib/pose';
import { colors, fonts } from '@/theme';

type Status = 'asking' | 'denied' | 'loading' | 'live' | 'error';

// Watches you through the camera, counts reps and says what to fix after each one.
export default function FormCheck() {
  useKeepAwake();
  const { name } = useLocalSearchParams<{ name: string }>();
  const rule = ruleFor(name);
  const [status, setStatus] = useState<Status>('asking');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [view, setView] = useState<{ visible: boolean; hint?: string }>({ visible: false });
  const [reps, setReps] = useState<Rep[]>([]);
  const web = useRef<CameraHandle>(null);
  const [count, setCount] = useState(() => (rule ? repCounter(rule) : null));

  useEffect(() => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      .then((r) => setStatus(r === PermissionsAndroid.RESULTS.GRANTED ? 'loading' : 'denied'))
      .catch(() => setStatus('denied'));
    return () => { Speech.stop(); };
  }, []);

  const onMessage = (m: CameraMessage) => {
    if (m.type === 'ready') setStatus('live');
    else if (m.type === 'error') { setError(m.message); setStatus(/NotAllowed|Permission/i.test(m.message) ? 'denied' : 'error'); }
    else if (count) {
      const step = count(m.p, m.t);
      setView((v) => (v.visible === step.visible && v.hint === step.hint ? v : { visible: step.visible, hint: step.hint }));
      const rep = step.rep;
      if (!rep) return;
      setReps((r) => [rep, ...r]);
      web.current?.injectJavaScript(`window.tone=${JSON.stringify(rep.faults.length ? colors.coral : colors.ok)};true;`);
      Speech.stop();
      Speech.speak(`${rep.n}. ${rep.faults[0]?.fix ?? 'Good'}`);
    }
  };

  const restart = () => { if (rule) setCount(() => repCounter(rule)); setReps([]); };
  const flip = () => { setFacing((f) => (f === 'user' ? 'environment' : 'user')); setStatus('loading'); restart(); };

  const last = reps[0];
  const good = reps.filter((r) => r.faults.length === 0).length;
  const summary = setSummary(reps);

  return (
    <Screen>
      <View style={styles.top}>
        <RoundButton icon="back" label="Back" onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>Form check · {name}</Text>
        <RoundButton icon="sync" label="Switch camera" disabled={status === 'asking' || status === 'denied'} onPress={flip} />
      </View>

      {!rule ? (
        <View style={styles.pad}><Body>The camera can't judge form for {name} yet.</Body></View>
      ) : (
        <>
          <View style={styles.camera}>
            {(status === 'loading' || status === 'live') && <PoseCamera key={facing} ref={web} facing={facing} onMessage={onMessage} />}
            <View pointerEvents="none" style={styles.overlay}>
              {status === 'live' && <Text style={styles.count}>{reps.length}</Text>}
              <Text style={styles.banner}>
                {status === 'asking' ? 'Asking for the camera…'
                  : status === 'loading' ? 'Starting the camera…'
                  : status === 'live' && !view.visible ? (view.hint ?? 'Step into view') : ''}
              </Text>
            </View>
            {status === 'denied' && (
              <View style={styles.center}>
                <Body style={{ textAlign: 'center' }}>Repsheet needs the camera to check your form. Nothing is recorded or sent.</Body>
                <Ghost label="Open settings" onPress={() => Linking.openSettings()} style={{ flexGrow: 0 }} />
              </View>
            )}
            {status === 'error' && (
              <View style={styles.center}>
                <Body style={{ textAlign: 'center' }}>Couldn't start the form check. The first one needs internet to download the pose model.</Body>
                <Sub style={{ textAlign: 'center' }}>{error}</Sub>
                <Ghost label="Try again" onPress={() => setStatus('loading')} style={{ flexGrow: 0 }} />
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.pad}>
            {last ? (
              <Card style={[styles.feedback, { borderColor: last.faults.length ? colors.coral : colors.ok }]}>
                <Eyebrow>REP {last.n} · {good} OF {reps.length} GOOD</Eyebrow>
                {last.faults.length === 0
                  ? <H2 style={{ color: colors.ok }}>Good rep</H2>
                  : last.faults.map((f) => (
                    <View key={f.fix}>
                      <H2 style={styles.fault}>{f.fix}</H2>
                      {f.detail ? <Sub>{f.detail}</Sub> : null}
                    </View>
                  ))}
                <Sub>{last.seconds} s</Sub>
              </Card>
            ) : (
              <Card><Eyebrow>SET UP</Eyebrow><Body style={{ marginTop: 4 }}>{rule.setup}</Body></Card>
            )}
            {summary.length > 0 && (
              <Card style={{ gap: 4 }}>
                <Eyebrow>THIS SET</Eyebrow>
                {summary.map((x) => <Body key={x.fix}>{x.fix} <Text style={styles.times}>{x.count} of {reps.length} reps</Text></Body>)}
              </Card>
            )}
            {reps.length > 0 && <Ghost label="Start a new set" onPress={restart} />}
            <Card style={{ gap: 6 }}>
              <Eyebrow>HOW TO DO IT</Eyebrow>
              {rule.how.map((h, i) => <Body key={h}>{i + 1}. {h}</Body>)}
            </Card>
            {last && <Sub>{rule.setup}</Sub>}
            <Sub>The check uses your joint angles, so it can't see grip, breathing or a rounded back. Use it alongside the video, not instead of it.</Sub>
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  camera: { height: '55%', marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  overlay: { position: 'absolute', inset: 0, justifyContent: 'space-between', padding: 14 },
  count: { alignSelf: 'flex-end', fontFamily: fonts.number, fontSize: 56, color: '#fff', textShadowColor: '#000', textShadowRadius: 8 },
  banner: { alignSelf: 'center', fontFamily: fonts.bold, fontSize: 18, color: '#fff', textShadowColor: '#000', textShadowRadius: 8 },
  center: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  pad: { padding: 16, gap: 12 },
  feedback: { gap: 6, borderWidth: 1.5 },
  times: { fontFamily: fonts.semibold, color: colors.muted },
  fault: { color: colors.hintText, fontSize: 20, lineHeight: 25 },
});
