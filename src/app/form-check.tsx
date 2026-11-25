import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CameraHandle, CameraMessage, PoseCamera } from '@/components/pose-camera';
import { Body, Card, Eyebrow, Ghost, H2, RoundButton, Screen, Sub } from '@/components/ui';
import { Rep, repCounter, ruleFor } from '@/lib/pose';
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
  const [inView, setInView] = useState(false);
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
      const step = count(m.p);
      setInView((v) => (v === step.visible ? v : step.visible));
      const rep = step.rep;
      if (!rep) return;
      setReps((r) => [rep, ...r]);
      web.current?.injectJavaScript(`window.tone=${JSON.stringify(rep.faults.length ? colors.coral : colors.ok)};true;`);
      Speech.stop();
      Speech.speak(`${rep.n}. ${rep.faults[0] ?? 'Good'}`);
    }
  };

  const restart = () => { if (rule) setCount(() => repCounter(rule)); setReps([]); };
  const flip = () => { setFacing((f) => (f === 'user' ? 'environment' : 'user')); setStatus('loading'); restart(); };

  const last = reps[0];
  const good = reps.filter((r) => r.faults.length === 0).length;

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
                  : status === 'live' && !inView ? 'Step into view' : ''}
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
                  : last.faults.map((f) => <H2 key={f} style={styles.fault}>{f}</H2>)}
              </Card>
            ) : (
              <Card><Eyebrow>SET UP</Eyebrow><Body style={{ marginTop: 4 }}>{rule.setup}</Body></Card>
            )}
            {reps.length > 0 && <Ghost label="Reset count" onPress={restart} />}
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
  fault: { color: colors.hintText, fontSize: 20, lineHeight: 25 },
});
