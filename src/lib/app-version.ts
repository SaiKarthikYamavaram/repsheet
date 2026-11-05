import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { isOlderVersion, Routine } from './logic';

// The runtime version is the installed APK's version, so an OTA update can't hide an old APK.
// Expo Go reports its own SDK label instead, so fall back to the config there.
export function installedVersion(): string {
  const runtime = Updates.runtimeVersion ?? '';
  return /^\d/.test(runtime) ? runtime : (Constants.expoConfig?.version ?? '');
}

export function newAppInfo(routine: Routine): { needed: boolean; url: string } {
  return {
    needed: isOlderVersion(installedVersion(), routine.minVersion),
    url: routine.updateUrl.startsWith('https://') ? routine.updateUrl : '',
  };
}
