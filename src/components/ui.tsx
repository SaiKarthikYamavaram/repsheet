import MaskedViewBase from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ComponentType, ReactElement, ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FORM_URL, SHEET_ID } from '@/config';
import { timeAgo } from '@/lib/logic';
import { SyncState, useSync } from '@/lib/sync';
import { colors, fonts, heat, heatEnd, heatStart } from '@/theme';

// The package's class type doesn't match React 19's JSX types.
const MaskedView = MaskedViewBase as unknown as ComponentType<{ maskElement: ReactElement; children: ReactNode }>;

const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  play: 'M8 5l11 7-11 7z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  chart: 'M4 17l5-6 4 3 7-9',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',
  barbell: 'M2 12h20M6 7v10M3.5 9v6M18 7v10M20.5 9v6',
  sync: 'M4 12a8 8 0 0113.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 01-13.7 5.6L4 15M4 20v-5h5',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  down: 'M6 9l6 6 6-6',
  warn: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.1',
  clock: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 7.5V12l3 2',
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, color = colors.text, solid }: { name: IconName; size?: number; color?: string; solid?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} fill={solid ? color : 'none'} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Glow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height={340}>
        <Defs>
          <RadialGradient id="glow" cx="85%" cy="0%" rx="90%" ry="100%">
            <Stop offset="0" stopColor={colors.coral} stopOpacity={0.2} />
            <Stop offset="1" stopColor={colors.coral} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }, style]}>
      <Glow />
      {children}
    </View>
  );
}

export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.h2, style]}>{children}</Text>;
export const Eyebrow = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.eyebrow, style]}>{children}</Text>;
export const Sub = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.sub, style]}>{children}</Text>;
export const Num = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.num, style]}>{children}</Text>;
export const Body = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[styles.body, style]}>{children}</Text>;
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[styles.card, style]}>{children}</View>;

export function HotText({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={heat} start={heatStart} end={heatEnd}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export function HeatButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.heatWrap, pressed && styles.pressed, style]}>
      <LinearGradient colors={heat} start={heatStart} end={heatEnd} style={styles.heat}>
        <Text style={styles.heatText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Ghost({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && styles.pressed, disabled && styles.disabled, style]}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function RoundButton({ icon, label, onPress, disabled, size = 40, hot }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; size?: number; hot?: boolean }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const glyph = <Icon name={icon} size={size * 0.42} color={hot ? colors.onHeat : colors.text} />;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.round, shape, pressed && styles.pressed, disabled && styles.disabled]}>
      {hot ? <LinearGradient colors={heat} start={heatStart} end={heatEnd} style={[styles.center, shape]}>{glyph}</LinearGradient> : glyph}
    </Pressable>
  );
}

export function Ring({ size, stroke, fraction }: { size: number; stroke: number; fraction: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.amber} />
          <Stop offset="1" stopColor={colors.rose} />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
      {f > 0 && (
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} rotation={-90} originX={size / 2} originY={size / 2} />
      )}
    </Svg>
  );
}

// Keeps what you're typing (like "62.") while saving each valid value straight away.
export function NumberField({ value, format, onCommit, style, label, decimal }: { value: number; format: (n: number) => string; onCommit: (n: number) => void; style?: StyleProp<TextStyle>; label: string; decimal?: boolean }) {
  const [draft, setDraft] = useState(format(value));
  useEffect(() => {
    setDraft((d) => (parseFloat(d) === value ? d : format(value)));
  }, [value, format]);
  return (
    <TextInput
      accessibilityLabel={label}
      value={draft}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      onChangeText={(t) => {
        const clean = t.replace(',', '.');
        setDraft(clean);
        const n = decimal ? parseFloat(clean) : parseInt(clean, 10);
        if (Number.isFinite(n) && n >= 0) onCommit(n);
      }}
      onBlur={() => setDraft(format(value))}
      style={[styles.field, style]}
    />
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* A modal is its own window, so the app's keyboard resize never reaches it. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function syncLabel(s: SyncState): { text: string; problem: boolean } {
  if (s.sheetError || s.backupError) return { text: 'Sync problem', problem: true };
  if (s.syncing) return { text: 'Syncing…', problem: false };
  if (FORM_URL && s.waiting > 0) return { text: `${s.waiting} waiting`, problem: false };
  if (!SHEET_ID) return { text: 'Starter routine', problem: false };
  if (s.fetchedAt) return { text: `Synced ${timeAgo(s.fetchedAt, Date.now())}`, problem: false };
  return { text: 'Not synced yet', problem: false };
}

export function SyncPill() {
  const { text, problem } = syncLabel(useSync());
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Sync status: ${text}`} onPress={() => router.push('/sync')} style={[styles.pill, problem && styles.pillProblem]}>
      <Icon name={problem ? 'warn' : 'sync'} size={13} color={problem ? colors.amber : colors.ok} />
      <Text style={[styles.pillText, problem && { color: colors.hintText }]}>{text}</Text>
    </Pressable>
  );
}

export function Hint({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.hint}>
      <Icon name="bolt" size={20} color={colors.amber} />
      <View style={{ flex: 1 }}>
        <Text style={styles.hintTitle}>{title}</Text>
        <Text style={styles.hintDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  center: { alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.text, letterSpacing: -0.5, paddingRight: 4 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.text, paddingRight: 4 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.3, color: colors.muted },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  num: { fontFamily: fonts.number, fontSize: 22, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  card: { backgroundColor: colors.glass, borderRadius: 18, padding: 14 },
  heatWrap: { borderRadius: 99, overflow: 'hidden', elevation: 8, shadowColor: colors.coral },
  heat: { paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center' },
  heatText: { fontFamily: fonts.display, fontSize: 16, color: colors.onHeat },
  ghost: { flexGrow: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 99, backgroundColor: colors.glass2 },
  ghostText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  round: { backgroundColor: colors.glass2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  field: { fontFamily: fonts.number, fontSize: 21, color: colors.text, textAlign: 'center', padding: 0, minWidth: 54 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { maxHeight: '76%', backgroundColor: colors.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99, backgroundColor: colors.glass },
  pillProblem: { backgroundColor: 'rgba(255,176,32,0.14)' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  hint: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,176,32,0.12)', borderWidth: 1, borderColor: 'rgba(255,176,32,0.35)' },
  hintTitle: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  hintDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.hintText },
});
