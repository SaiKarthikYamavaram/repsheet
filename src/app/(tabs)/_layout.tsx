import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/ui';
import { colors, fonts, heat, heatEnd, heatStart } from '@/theme';

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'home' },
  progress: { label: 'Progress', icon: 'chart' },
  history: { label: 'History', icon: 'clock' },
  library: { label: 'Library', icon: 'book' },
};

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function Bar({ state, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const item = ITEMS[route.name];
          const on = state.index === i;
          const body = (
            <>
              <Icon name={item.icon} size={18} color={on ? colors.onHeat : colors.muted} />
              <Text style={[styles.label, on && { color: colors.onHeat }]}>{item.label}</Text>
            </>
          );
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => navigateToTab(route.key)} style={styles.item}>
              {on ? <LinearGradient colors={heat} start={heatStart} end={heatEnd} style={styles.inner}>{body}</LinearGradient> : <View style={styles.inner}>{body}</View>}
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
  bar: { flexDirection: 'row', gap: 2, padding: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.09)' },
  item: { flex: 1, borderRadius: 99, overflow: 'hidden' },
  inner: { alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
});
