import * as Notifications from 'expo-notifications';

import { getKv, setKv } from './db';

export function requestRestAlerts() {
  Notifications.requestPermissionsAsync().catch(() => {});
}

// Fires even with the phone locked, when the screen's own timer isn't running.
export async function scheduleRestAlert(seconds: number, body: string) {
  await cancelRestAlert();
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest is over', body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds), channelId: 'rest' },
    });
    setKv('rest-alert', id);
  } catch {
    // Without notification permission the on-screen timer still works.
  }
}

export async function cancelRestAlert() {
  const id = getKv('rest-alert');
  if (!id) return;
  setKv('rest-alert', null);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
