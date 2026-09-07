import * as Speech from 'expo-speech';
import { parseCommand } from './CommandParser';
import { organizeFiles, createFolder, listFiles, deleteFile, getStorageInfo } from './FileManager';
import { openApp, openSettings, getAvailableApps } from './AppLauncher';
import { callBridge } from './BridgeClient';
import { selfUninstall, selfUpdate, openAppInfo } from './SelfManager';
import { JarvisResponse, ConversationEntry } from '../types';

const JARVIS_VOICE_OPTIONS = {
  language: 'en-GB',
  pitch: 0.85,
  rate: 0.9,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createEntry(role: 'user' | 'jarvis', text: string): ConversationEntry {
  return {
    id: generateId(),
    role,
    text,
    timestamp: new Date(),
  };
}

export async function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      ...JARVIS_VOICE_OPTIONS,
      onDone: resolve,
      onStopped: resolve,
      onError: () => resolve(),
    });
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

const conversationHistory: Array<{ role: 'user' | 'jarvis'; text: string }> = [];

async function executeAction(action: string, target: string | null): Promise<(() => Promise<void>) | undefined> {
  switch (action) {
    case 'open_app':
      if (target) {
        return async () => { await openApp(target); };
      }
      return undefined;

    case 'organize_files':
      return async () => { await organizeFiles(); };

    case 'create_folder':
      if (target) {
        return async () => { await createFolder(target); };
      }
      return undefined;

    case 'list_files':
      return undefined;

    case 'delete_file':
      if (target) {
        return async () => { await deleteFile(target); };
      }
      return undefined;

    case 'open_settings':
      return async () => { await openSettings(); };

    case 'self_update':
      return async () => { await selfUpdate(); };

    case 'self_uninstall':
      return async () => { await selfUninstall(); };

    case 'self_info':
      return async () => { await openAppInfo(); };

    default:
      return undefined;
  }
}

export async function processCommand(text: string): Promise<JarvisResponse> {
  conversationHistory.push({ role: 'user', text });

  // Try the Claude bridge first
  const bridgeResponse = await callBridge(text, conversationHistory);

  if (bridgeResponse) {
    conversationHistory.push({ role: 'jarvis', text: bridgeResponse.text });

    // Keep history manageable
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, conversationHistory.length - 20);
    }

    let actionFn: (() => Promise<void>) | undefined;
    if (bridgeResponse.action) {
      actionFn = await executeAction(bridgeResponse.action, bridgeResponse.target);
    }

    return {
      text: bridgeResponse.text,
      success: true,
      action: actionFn,
    };
  }

  // Fallback to local command parsing when bridge is unavailable
  const response = await processLocally(text);

  conversationHistory.push({ role: 'jarvis', text: response.text });
  if (conversationHistory.length > 20) {
    conversationHistory.splice(0, conversationHistory.length - 20);
  }

  return response;
}

async function processLocally(text: string): Promise<JarvisResponse> {
  const lower = text.toLowerCase();

  // Self-management commands (local handling)
  if (lower.includes('uninstall yourself') || lower.includes('remove yourself') || lower.includes('delete yourself')) {
    const result = await selfUninstall();
    return { text: result, success: true };
  }

  if (lower.includes('update yourself') || lower.includes('upgrade yourself') || lower.includes('update jarvis') || lower.includes('update app')) {
    const result = await selfUpdate();
    return { text: result, success: true };
  }

  if (lower.includes('app info') || lower.includes('about yourself') || lower.includes('your info')) {
    const result = await openAppInfo();
    return { text: result, success: true };
  }

  const command = parseCommand(text);

  switch (command.category) {
    case 'files':
      return handleFileCommand(command.action, command.target);
    case 'apps':
      return handleAppCommand(command.action, command.target);
    case 'system':
      return handleSystemCommand(command.action, command.target);
    case 'info':
      return handleInfoCommand(text);
    default:
      return {
        text: getSmallTalkResponse(text),
        success: true,
      };
  }
}

async function handleFileCommand(action: string, target: string): Promise<JarvisResponse> {
  switch (action) {
    case 'organize': {
      const result = await organizeFiles();
      return { text: result, success: true };
    }
    case 'create': {
      const folderName = target.replace(/folder|called|named|a |my /gi, '').trim() || 'New Folder';
      const result = await createFolder(folderName);
      return { text: result, success: true };
    }
    case 'delete': {
      const fileName = target.replace(/file|folder/gi, '').trim();
      const result = await deleteFile(fileName);
      return { text: result, success: true };
    }
    case 'info': {
      const files = await listFiles();
      if (files.length === 0) {
        return { text: "Your files directory is empty, sir.", success: true };
      }
      const fileList = files.map(f => `${f.isDirectory ? '\u{1F4C1}' : '\u{1F4C4}'} ${f.name}`).join('\n');
      return {
        text: `Here's what's in your files, sir:\n${fileList}`,
        success: true,
      };
    }
    default: {
      const files = await listFiles();
      if (files.length === 0) {
        return { text: "Your files directory is empty at the moment, sir. I can create folders or organise files for you.", success: true };
      }
      const result = await organizeFiles();
      return { text: result, success: true };
    }
  }
}

async function handleAppCommand(action: string, target: string): Promise<JarvisResponse> {
  if (action === 'close') {
    return {
      text: "I'm afraid I can't close apps directly due to mobile OS restrictions, sir. But I can open anything you need.",
      success: true,
    };
  }

  const result = await openApp(target);
  return { text: result, success: true };
}

async function handleSystemCommand(action: string, target: string): Promise<JarvisResponse> {
  const lower = target.toLowerCase();

  if (lower.includes('settings')) {
    const result = await openSettings();
    return { text: result, success: true };
  }

  if (lower.includes('volume') || lower.includes('brightness') || lower.includes('wifi') ||
      lower.includes('bluetooth') || lower.includes('flashlight') || lower.includes('torch')) {
    const result = await openSettings();
    return {
      text: `I'll open your settings so you can adjust that, sir. Direct hardware controls require system-level access. ${result}`,
      success: true,
    };
  }

  return {
    text: "I'll route you to your system settings for that, sir.",
    success: true,
    action: async () => { await openSettings(); },
  };
}

async function handleInfoCommand(text: string): Promise<JarvisResponse> {
  const lower = text.toLowerCase();

  if (lower.includes('time')) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { text: `It's currently ${time}, sir.`, success: true };
  }

  if (lower.includes('date')) {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { text: `Today is ${date}, sir.`, success: true };
  }

  if (lower.includes('storage') || lower.includes('space') || lower.includes('disk')) {
    const result = await getStorageInfo();
    return { text: result, success: true };
  }

  if (lower.includes('battery')) {
    return { text: "I'm afraid I can't read your battery level directly, sir, but you can check it in your status bar or settings.", success: true };
  }

  if (lower.includes('who are you') || lower.includes('your name')) {
    return {
      text: "I'm Jarvis, sir. Your personal AI assistant, powered by Claude. I can organise your files, open apps, and help manage your device. Think of me as your digital butler.",
      success: true,
    };
  }

  if (lower.includes('help') || lower.includes('what can you do')) {
    const apps = getAvailableApps().slice(0, 10).join(', ');
    return {
      text: `Right then, sir. Here's what I can do:\n\nFile Management — "Organise my files", "Create a folder called Work", "Show my files"\n\nApp Launching — "Open YouTube", "Launch Spotify", "Open Camera"\nAvailable: ${apps}, and more.\n\nSystem — "Open settings"\n\nInfo — "What time is it?", "How much storage do I have?"\n\nSelf-Management — "Update yourself", "Uninstall yourself"`,
      success: true,
    };
  }

  return {
    text: getSmallTalkResponse(text),
    success: true,
  };
}

function getSmallTalkResponse(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('sup')) {
    const greetings = [
      "Good to hear from you, sir. What can I do for you?",
      "At your service, sir. What do you need?",
      "Hello, sir. Ready when you are.",
      "Ah, sir. What's on the agenda today?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.includes('thank')) {
    const thanks = [
      "Happy to help, sir.",
      "Anytime, sir. That's what I'm here for.",
      "My pleasure, sir.",
      "Of course, sir. Anything else?",
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  if (lower.includes('good morning')) {
    return "Good morning, sir. Shall we get the day started? What do you need?";
  }

  if (lower.includes('good night') || lower.includes('goodnight')) {
    return "Goodnight, sir. I'll be here when you need me.";
  }

  const fallbacks = [
    "I'm not entirely sure what you need, sir. Try saying 'help' to see what I can do.",
    "I didn't quite catch that, sir. I can organise files, open apps, or give you system info. Just say the word.",
    "I'm afraid that's not in my repertoire at the moment, sir. Try something like 'organise my files' or 'open YouTube'.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
