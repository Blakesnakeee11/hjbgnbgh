import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

interface AppMapping {
  keywords: string[];
  android?: string;
  ios?: string;
  url?: string;
  label: string;
}

const APP_MAP: AppMapping[] = [
  {
    keywords: ['camera'],
    android: 'com.android.camera',
    ios: 'camera://',
    label: 'Camera',
  },
  {
    keywords: ['settings', 'setting'],
    android: 'com.android.settings',
    ios: 'app-settings://',
    label: 'Settings',
  },
  {
    keywords: ['chrome', 'browser', 'web', 'internet'],
    android: 'com.android.chrome',
    ios: 'googlechrome://',
    url: 'https://www.google.com',
    label: 'Browser',
  },
  {
    keywords: ['youtube'],
    android: 'com.google.android.youtube',
    ios: 'youtube://',
    url: 'https://www.youtube.com',
    label: 'YouTube',
  },
  {
    keywords: ['spotify', 'music'],
    android: 'com.spotify.music',
    ios: 'spotify://',
    label: 'Spotify',
  },
  {
    keywords: ['maps', 'navigation', 'directions'],
    android: 'com.google.android.apps.maps',
    ios: 'maps://',
    label: 'Maps',
  },
  {
    keywords: ['phone', 'dialer', 'call'],
    android: 'com.android.dialer',
    ios: 'tel://',
    label: 'Phone',
  },
  {
    keywords: ['messages', 'sms', 'text', 'messaging'],
    android: 'com.android.mms',
    ios: 'sms://',
    label: 'Messages',
  },
  {
    keywords: ['email', 'mail', 'gmail'],
    android: 'com.google.android.gm',
    ios: 'googlegmail://',
    url: 'mailto:',
    label: 'Email',
  },
  {
    keywords: ['calendar', 'schedule'],
    android: 'com.google.android.calendar',
    ios: 'calshow://',
    label: 'Calendar',
  },
  {
    keywords: ['clock', 'alarm', 'timer'],
    android: 'com.android.deskclock',
    ios: 'clock-alarm://',
    label: 'Clock',
  },
  {
    keywords: ['calculator', 'calc'],
    android: 'com.android.calculator2',
    label: 'Calculator',
  },
  {
    keywords: ['contacts', 'people'],
    android: 'com.android.contacts',
    ios: 'contacts://',
    label: 'Contacts',
  },
  {
    keywords: ['instagram'],
    android: 'com.instagram.android',
    ios: 'instagram://',
    url: 'https://www.instagram.com',
    label: 'Instagram',
  },
  {
    keywords: ['twitter', 'x app'],
    android: 'com.twitter.android',
    ios: 'twitter://',
    url: 'https://twitter.com',
    label: 'Twitter / X',
  },
  {
    keywords: ['whatsapp'],
    android: 'com.whatsapp',
    ios: 'whatsapp://',
    label: 'WhatsApp',
  },
  {
    keywords: ['tiktok'],
    android: 'com.zhiliaoapp.musically',
    ios: 'snssdk1128://',
    url: 'https://www.tiktok.com',
    label: 'TikTok',
  },
  {
    keywords: ['netflix'],
    android: 'com.netflix.mediaclient',
    ios: 'nflx://',
    label: 'Netflix',
  },
  {
    keywords: ['snapchat', 'snap'],
    android: 'com.snapchat.android',
    ios: 'snapchat://',
    label: 'Snapchat',
  },
  {
    keywords: ['facebook', 'fb'],
    android: 'com.facebook.katana',
    ios: 'fb://',
    url: 'https://www.facebook.com',
    label: 'Facebook',
  },
  {
    keywords: ['files', 'file manager', 'my files'],
    android: 'com.android.documentsui',
    label: 'Files',
  },
  {
    keywords: ['gallery', 'photos', 'pictures'],
    android: 'com.google.android.apps.photos',
    ios: 'photos-redirect://',
    label: 'Photos',
  },
  {
    keywords: ['notes', 'notepad'],
    ios: 'mobilenotes://',
    label: 'Notes',
  },
];

function findApp(query: string): AppMapping | undefined {
  const lower = query.toLowerCase().trim();
  return APP_MAP.find(app =>
    app.keywords.some(kw => lower.includes(kw))
  );
}

export async function openApp(query: string): Promise<string> {
  const app = findApp(query);

  if (!app) {
    return `I don't have "${query}" mapped yet, sir. But I'm learning. Try asking for common apps like Camera, Chrome, YouTube, Spotify, or Settings.`;
  }

  try {
    if (Platform.OS === 'android' && app.android) {
      const uri = `package:${app.android}`;
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
        return `Opening ${app.label} for you, sir.`;
      }
    }

    if (Platform.OS === 'ios' && app.ios) {
      const canOpen = await Linking.canOpenURL(app.ios);
      if (canOpen) {
        await Linking.openURL(app.ios);
        return `Opening ${app.label} for you, sir.`;
      }
    }

    if (app.url) {
      await Linking.openURL(app.url);
      return `Opening ${app.label} for you, sir.`;
    }

    return `${app.label} doesn't seem to be installed on this device, sir.`;
  } catch {
    if (app.url) {
      try {
        await Linking.openURL(app.url);
        return `Opening ${app.label} in the browser instead, sir.`;
      } catch {
        return `I had trouble opening ${app.label}, sir. It may not be installed.`;
      }
    }
    return `I couldn't launch ${app.label}, sir. Make sure it's installed on your device.`;
  }
}

export async function openSettings(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_SETTINGS
      );
    } else {
      await Linking.openURL('app-settings://');
    }
    return "Opening settings for you, sir.";
  } catch {
    return "I couldn't open settings, sir.";
  }
}

export function getAvailableApps(): string[] {
  return APP_MAP.map(app => app.label);
}
