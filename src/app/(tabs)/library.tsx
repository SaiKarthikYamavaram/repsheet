import { ObserveInteractiveMarker } from 'expo-observe';
import { router } from 'expo-router';
import { Image, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Eyebrow, H1, Icon, Screen, Sub, SyncPill } from '@/components/ui';
import { lastLifts } from '@/lib/db';
import { Exercise, fmtKg, youtubeId } from '@/lib/logic';
import { useSync } from '@/lib/sync';
import { colors, fonts } from '@/theme';

function Row({ e }: { e: Exercise }) {
  const id = youtubeId(e.videoUrl);
  const top = lastLifts(e.name)[0];
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: e.name } })} style={styles.row}>
      <View style={styles.thumb}>
        {id ? <Image source={{ uri: `https://img.youtube.com/vi/${id}/default.jpg` }} style={StyleSheet.absoluteFill} /> : <Icon name="barbell" size={22} color={colors.muted} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{e.name}</Text>
        <Sub>{top ? `${fmtKg(top.kg)} kg × ${top.reps} last time` : e.videoUrl ? 'Not logged yet' : 'No video yet'}</Sub>
      </View>
      <Icon name="next" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function Library() {
  const { routine } = useSync();
  const groups = new Map<string, Exercise[]>();
  routine.exercises.forEach((e) => groups.set(e.muscle, [...(groups.get(e.muscle) ?? []), e]));
  const sections = [...groups.keys()].sort().map((title) => ({ title, data: groups.get(title)! }));
  return (
    <Screen>
      <ObserveInteractiveMarker />
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.name}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.spread}><H1>Library</H1><SyncPill /></View>}
        renderSectionHeader={({ section }) => <Eyebrow style={styles.section}>{section.title.toUpperCase()}</Eyebrow>}
        renderItem={({ item }) => <Row e={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  section: { marginTop: 18, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  thumb: { width: 58, height: 42, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass2 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
