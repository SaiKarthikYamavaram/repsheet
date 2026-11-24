import * as Notifications from 'expo-notifications';

import { getKv, setKv } from './db';

// True while the workout screen's countdown is showing, so the app only stays quiet when you can see it.
let onScreen = false;
export const isRestOnScreen = () => onScreen;
export const setRestOnScreen = (on: boolean) => { onScreen = on; };

// Runs scheduling and cancelling one at a time, so quick taps can't leave a stray alert behind.
let queue: Promise<void> = Promise.resolve();
const serial = (job: () => Promise<void>) => (queue = queue.then(job).catch(() => {}));

export function requestRestAlerts() {
  Notifications.requestPermissionsAsync().catch(() => {});
}

// Fires even with the phone locked, when the screen's own timer isn't running.
// An alarm clock trigger is never delayed for battery saving, unlike a plain timer, which
// Android may fire a minute or more late. Without the exact alarm permission it falls back.
export function scheduleRestAlert(seconds: number, body: string) {
  const date = Date.now() + Math.max(1, seconds) * 1000;
  return serial(async () => {
    await cancelNow();
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Rest is over', body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'rest', delivery: 'alarmClock' },
      });
      setKv('rest-alert', id);
    } catch {
      // Without notification permission the on-screen timer still works.
    }
  });
}

// Cancels the alert if it hasn't fired yet, and clears it from the shade if it has.
export function cancelRestAlert() {
  return serial(cancelNow);
}

async function cancelNow() {
  const id = getKv('rest-alert');
  if (!id) return;
  setKv('rest-alert', null);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await Notifications.dismissNotificationAsync(id).catch(() => {});
}
