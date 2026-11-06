import * as Notifications from 'expo-notifications';

import { getKv, setKv } from './db';

export function requestRestAlerts() {
  Notifications.requestPermissionsAsync().catch(() => {});
}

// Fires even with the phone locked, when the screen's own timer isn't running.
// An alarm clock trigger is never delayed for battery saving, unlike a plain timer, which
// Android may fire a minute or more late. Without the exact alarm permission it falls back.
export async function scheduleRestAlert(seconds: number, body: string) {
  await cancelRestAlert();
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest is over', body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + Math.max(1, seconds) * 1000,
        channelId: 'rest',
        delivery: 'alarmClock',
      },
    });
    setKv('rest-alert', id);
  } catch {
    // Without notification permission the on-screen timer still works.
  }
}

// Cancels the alert if it hasn't fired yet, and clears it from the shade if it has.
export async function cancelRestAlert() {
  const id = getKv('rest-alert');
  if (!id) return;
  setKv('rest-alert', null);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await Notifications.dismissNotificationAsync(id).catch(() => {});
}
