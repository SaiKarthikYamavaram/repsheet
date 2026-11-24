import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isRestOnScreen } from '@/lib/rest-alert';
import { flushOutbox, refreshIfStale, syncAll } from '@/lib/sync';
import { colors, fontFiles } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Must run before any screen mounts. Route params only ever hold exercise names, not personal data.
Observe.configure({ integrations: { 'expo-router': true } });

// The rest countdown handles the end of rest itself while it's showing. On any other screen the alert
// still needs to show, or you'd never hear that rest is over.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const show = !isRestOnScreen();
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  },
});

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.screen, card: colors.screen } };

function RootLayout() {
  const { markInteractive } = useObserve();
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    markInteractive();
  }, [ready, markInteractive]);

  useEffect(() => {
    Notifications.setNotificationChannelAsync('rest', {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
    }).catch((e) => console.warn('Rest alert channel failed', e));
    syncAll();
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      flushOutbox();
      refreshIfStale();
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

export default ObserveRoot.wrap(RootLayout);
