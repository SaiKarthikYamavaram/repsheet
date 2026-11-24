import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/ui';
import { clock } from '@/lib/logic';
import { Rest, useRest } from '@/lib/rest-alert';
import { colors, fonts, heat, heatEnd, heatStart } from '@/theme';

const PAD = 5;
const GAP = 2;

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'home' },
  progress: { label: 'Progress', icon: 'chart' },
  history: { label: 'History', icon: 'clock' },
  library: { label: 'Library', icon: 'book' },
};

// Shows the rest countdown when you've left the workout screen mid-rest, and takes you back.
function RestPill() {
  const rest = useRest();
  // Keyed so each new rest starts with a fresh clock.
  return rest ? <RestCountdown key={rest.endsAt} rest={rest} /> : null;
}

function RestCountdown({ rest }: { rest: Rest }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() > rest.endsAt) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [rest]);
  if (rest.endsAt <= now) return null;
  const left = clock(Math.ceil((rest.endsAt - now) / 1000));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Resting, ${left} left. Back to workout`} onPress={() => router.push('/workout')} style={styles.rest}>
      <Icon name="clock" size={15} color={colors.coral} />
      <Text style={styles.restTime}>REST {left}</Text>
      <Text style={styles.restBack}>Back to workout</Text>
    </Pressable>
  );
}

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function Bar({ state, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: state.index, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 }).start();
  }, [slide, state.index]);

  const count = state.routes.length;
  const itemW = (width - PAD * 2 - GAP * (count - 1)) / count;
  // Stretch the pill a little while it moves, so it reads as sliding rather than jumping.
  const stretch = slide.interpolate({ inputRange: [...Array(count * 2 - 1).keys()].map((k) => k / 2), outputRange: [...Array(count * 2 - 1).keys()].map((k) => (k % 2 ? 1.15 : 1)), extrapolate: 'clamp' });

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
      <RestPill />
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View pointerEvents="none" style={[styles.pill, { width: itemW, transform: [{ translateX: Animated.multiply(slide, itemW + GAP) }, { scaleX: stretch }] }]}>
            <LinearGradient colors={heat} start={heatStart} end={heatEnd} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        {state.routes.map((route, i) => {
          const item = ITEMS[route.name];
          const on = state.index === i;
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => navigateToTab(route.key)} style={styles.item}>
              <Icon name={item.icon} size={18} color={on ? colors.onHeat : colors.muted} />
              <Text style={[styles.label, on && { color: colors.onHeat }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <Bar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.screen } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.screen },
  bar: { flexDirection: 'row', gap: GAP, padding: PAD, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.09)' },
  pill: { position: 'absolute', left: PAD, top: PAD, bottom: PAD, borderRadius: 99, overflow: 'hidden' },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  rest: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: 'rgba(255,92,53,0.16)', borderWidth: 1, borderColor: 'rgba(255,92,53,0.45)' },
  restTime: { fontFamily: fonts.number, fontSize: 14, color: colors.text },
  restBack: { fontFamily: fonts.semibold, fontSize: 12, color: colors.link },
});
