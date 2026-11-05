import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { youtubeId } from '@/lib/logic';
import { colors, fonts } from '@/theme';

import { Icon } from './ui';

// Loads only a thumbnail until you tap play, to save mobile data.
export function FormVideo({ url, rounded }: { url: string; rounded?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);
  const frame = [styles.frame, rounded && styles.rounded];

  if (playing && id) {
    return (
      <View>
        <View style={[frame, styles.player]}>
          <WebView
            source={{
              uri: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`,
              // YouTube refuses to play embeds that arrive with no referrer.
              headers: { Referer: 'https://com.sai21.repsheet' },
            }}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            javaScriptEnabled
            style={styles.web}
          />
        </View>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} style={styles.open}>
          <Text style={styles.openText}>Video not playing? Open in YouTube</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={url ? 'Play form video' : 'No form video yet'}
      disabled={!url}
      onPress={() => (id ? setPlaying(true) : Linking.openURL(url))}
      style={frame}
    >
      <LinearGradient colors={['#ff7b3a', '#3b1533', '#c21a6b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {id ? (
        <Image source={{ uri: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.art}><Icon name="barbell" size={120} color="rgba(255,255,255,0.13)" /></View>
      )}
      {url ? (
        <View style={styles.play}><Icon name="play" size={22} solid color="#fff" /></View>
      ) : (
        <Text style={styles.empty}>No video yet. Add a YouTube link in your sheet.</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#17111c' },
  rounded: { borderRadius: 20 },
  player: { alignItems: 'stretch' },
  web: { flex: 1, backgroundColor: '#000' },
  art: { position: 'absolute' },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: '#fff', textAlign: 'center', paddingHorizontal: 24 },
  open: { padding: 8, alignItems: 'center' },
  openText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.link },
});
