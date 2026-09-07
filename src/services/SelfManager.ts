import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { PACKAGE_NAME, UPDATE_URL } from '../config';

export async function selfUninstall(): Promise<string> {
  if (Platform.OS !== 'android') {
    return "I'm afraid self-removal is only available on Android, sir.";
  }

  try {
    await IntentLauncher.startActivityAsync(
      'android.intent.action.DELETE' as IntentLauncher.ActivityAction,
      { data: `package:${PACKAGE_NAME}` },
    );
    return "The uninstall prompt should be on your screen now, sir. It has been an honour.";
  } catch {
    try {
      await Linking.openURL(`package:${PACKAGE_NAME}`);
      return "I've opened my app settings, sir. You can uninstall from there.";
    } catch {
      return "I wasn't able to open the uninstall screen, sir. You can remove me from Settings > Apps.";
    }
  }
}

export async function selfUpdate(): Promise<string> {
  try {
    await Linking.openURL(UPDATE_URL);
    return "I've opened the download for the latest version, sir. Once it downloads, tap to install the update.";
  } catch {
    return "I wasn't able to reach the update, sir. Check your internet connection and try again.";
  }
}

export async function openAppInfo(): Promise<string> {
  if (Platform.OS !== 'android') {
    return "App info is only available on Android, sir.";
  }

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
      { data: `package:${PACKAGE_NAME}` },
    );
    return "Here are my app details, sir.";
  } catch {
    return "I couldn't open the app info screen, sir.";
  }
}
