import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

const FLAG_GRANT_READ_URI_PERMISSION = 1;

// Downloads the APK into the cache, overwriting the last one, then opens Android's installer.
// Android asks once to allow installs from Repsheet. The APK must be signed with the same key,
// which EAS does, or Android refuses to install it over this one.
export async function installApk(url: string, onProgress: (fraction: number) => void): Promise<void> {
  const file = new File(Paths.cache, 'repsheet-update.apk');
  await File.downloadFileAsync(url, file, {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => { if (totalBytes > 0) onProgress(bytesWritten / totalBytes); },
  });
  await startActivityAsync('android.intent.action.VIEW', {
    data: await getContentUriAsync(file.uri),
    type: 'application/vnd.android.package-archive',
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
