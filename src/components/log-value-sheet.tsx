import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fmtKg } from '@/lib/logic';

import { Ghost, H2, HeatButton, NumberField, RoundButton, Sheet, Sub } from './ui';

export function LogValueSheet({ visible, title, unit, start, step, onClose, onSave }: { visible: boolean; title: string; unit: string; start: number; step: number; onClose: () => void; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(start);
  useEffect(() => {
    if (visible) setDraft(start);
  }, [visible, start]);
  const nudge = (by: number) => setDraft((v) => Math.max(0, +(v + by).toFixed(2)));
  return (
    <Sheet visible={visible} onClose={onClose}>
      <H2>{title}</H2>
      <View style={styles.stepper}>
        <RoundButton icon="minus" label="Less" size={56} onPress={() => nudge(-step)} />
        <View style={styles.value}>
          <NumberField decimal label={`${title} in ${unit}`} value={draft} format={fmtKg} onCommit={setDraft} style={styles.field} />
          <Sub>{unit}</Sub>
        </View>
        <RoundButton hot icon="plus" label="More" size={56} onPress={() => nudge(step)} />
      </View>
      <HeatButton label="SAVE" onPress={() => onSave(draft)} />
      <Ghost label="Cancel" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  value: { alignItems: 'center' },
  field: { fontSize: 38 },
});
