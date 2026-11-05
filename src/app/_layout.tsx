import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushOutbox, syncAll } from '@/lib/sync';
import { colors, fontFiles } from '@/theme';

SplashScreen.preventAutoHideAsync();

// The workout screen handles the end of rest itself while it's open, so the alert only shows when you're away.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
});

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.screen, card: colors.screen } };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    Notifications.setNotificationChannelAsync('rest', {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
    }).catch((e) => console.warn('Rest alert channel failed', e));
    syncAll();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') flushOutbox();
    });
    return () => sub.remove();
  }, []);

  if (!ready) return null;
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.screen } }} />
    </ThemeProvider>
  );
}
