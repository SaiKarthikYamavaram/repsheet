import { StyleSheet, Text, View } from 'react-native';

import { fmtKg } from '@/lib/logic';
import { colors, fonts } from '@/theme';

// Competition plate colours, so the picture matches what's on the rack.
function look(kg: number): { background: string; ink: string; height: number; width: number } {
  if (kg >= 25) return { background: '#d8352a', ink: '#fff', height: 96, width: 30 };
  if (kg >= 20) return { background: '#2f6fd0', ink: '#fff', height: 96, width: 28 };
  if (kg >= 15) return { background: '#f2c230', ink: '#1c1600', height: 88, width: 26 };
  if (kg >= 10) return { background: '#3b9a4e', ink: '#fff', height: 76, width: 24 };
  if (kg >= 5) return { background: '#eef1ee', ink: '#111', height: 58, width: 22 };
  if (kg >= 2.5) return { background: '#3a3a44', ink: '#fff', height: 46, width: 20 };
  return { background: '#8d8c99', ink: '#111', height: 36, width: 18 };
}

export function PlateBar({ plates }: { plates: number[] }) {
  return (
    <View accessible accessibilityLabel={plates.length ? `Each side: ${plates.map(fmtKg).join(', ')} kilograms` : 'Empty bar'} style={styles.bar}>
      <View style={styles.collar} />
      {plates.map((kg, i) => {
        const l = look(kg);
        return (
          <View key={`${kg}-${i}`} style={[styles.plate, { backgroundColor: l.background, height: l.height, width: l.width }]}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, { color: l.ink }]}>{fmtKg(kg)}</Text>
          </View>
        );
      })}
      <View style={styles.sleeve} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 104, paddingVertical: 4 },
  collar: { width: 14, height: 24, borderRadius: 3, backgroundColor: colors.muted },
  plate: { borderRadius: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1 },
  label: { fontFamily: fonts.bold, fontSize: 10 },
  sleeve: { flex: 1, minWidth: 16, height: 12, borderRadius: 2, backgroundColor: colors.muted },
});
