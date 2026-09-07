import * as Speech from 'expo-speech';
import { parseCommand } from './CommandParser';
import { organizeFiles, createFolder, listFiles, deleteFile, getStorageInfo } from './FileManager';
import { openApp, openSettings, getAvailableApps } from './AppLauncher';
import { callBridge } from './BridgeClient';
import { selfUninstall, selfUpdate, openAppInfo } from './SelfManager';
import { JarvisResponse, ConversationEntry } from '../types';

let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch {
  // expo-av not available
}

const FALLBACK_VOICE = {
  language: 'en-GB',
  pitch: 0.85,
  rate: 0.9,
};

let currentSound: any = null;

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

async function playKokoroAudio(audioUrl: string): Promise<boolean> {
  if (!AudioModule) return false;
  try {
    await stopSpeaking();
    const { sound } = await AudioModule.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true },
    );
    currentSound = sound;

    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          currentSound = null;
          resolve(true);
        }
      });
      setTimeout(() => {
        resolve(true);
      }, 30000);
    });
  } catch {
    return false;
  }
}

function speakFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      ...FALLBACK_VOICE,
      onDone: resolve,
      onStopped: resolve,
      onError: () => resolve(),
    });
  });
}

export async function speak(text: string, audioUrl?: string | null): Promise<void> {
  if (audioUrl) {
    const played = await playKokoroAudio(audioUrl);
    if (played) return;
  }
  await speakFallback(text);
}

export async function stopSpeaking(): Promise<void> {
  Speech.stop();
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
}

const conversationHistory: Array<{ role: 'user' | 'jarvis'; text: string }> = [];

async function executeAction(action: string, target: string | null): Promise<(() => Promise<void>) | undefined> {
  switch (action) {
    case 'open_app':
      if (target) return async () => { await openApp(target); };
      return undefined;
    case 'organize_files':
      return async () => { await organizeFiles(); };
    case 'create_folder':
      if (target) return async () => { await createFolder(target); };
      return undefined;
    case 'list_files':
      return undefined;
    case 'delete_file':
      if (target) return async () => { await deleteFile(target); };
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

  const bridgeResponse = await callBridge(text, conversationHistory);

  if (bridgeResponse) {
    conversationHistory.push({ role: 'jarvis', text: bridgeResponse.text });
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
      audioUrl: bridgeResponse.audioUrl,
    };
  }

  const response = await processLocally(text);
  conversationHistory.push({ role: 'jarvis', text: response.text });
  if (conversationHistory.length > 20) {
    conversationHistory.splice(0, conversationHistory.length - 20);
  }
  return response;
}

async function processLocally(text: string): Promise<JarvisResponse> {
  const lower = text.toLowerCase();

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
      return { text: getSmallTalkResponse(text), success: true };
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
      if (files.length === 0) return { text: "Your files directory is empty, sir.", success: true };
      const fileList = files.map(f => `${f.isDirectory ? '\u{1F4C1}' : '\u{1F4C4}'} ${f.name}`).join('\n');
      return { text: `Here's what's in your files, sir:\n${fileList}`, success: true };
    }
    default: {
      const files = await listFiles();
      if (files.length === 0) return { text: "Your files directory is empty at the moment, sir.", success: true };
      const result = await organizeFiles();
      return { text: result, success: true };
    }
  }
}

async function handleAppCommand(action: string, target: string): Promise<JarvisResponse> {
  if (action === 'close') {
    return { text: "I'm afraid I can't close apps directly, sir. But I can open anything you need.", success: true };
  }
  const result = await openApp(target);
  return { text: result, success: true };
}

async function handleSystemCommand(_action: string, target: string): Promise<JarvisResponse> {
  const lower = target.toLowerCase();
  if (lower.includes('settings') || lower.includes('volume') || lower.includes('brightness') ||
      lower.includes('wifi') || lower.includes('bluetooth')) {
    const result = await openSettings();
    return { text: `Opening settings for you, sir. ${result}`, success: true };
  }
  return { text: "I'll route you to your system settings, sir.", success: true, action: async () => { await openSettings(); } };
}

async function handleInfoCommand(text: string): Promise<JarvisResponse> {
  const lower = text.toLowerCase();

  if (lower.includes('time')) {
    const time = new Date().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { text: `It's currently ${time}, sir.`, success: true };
  }
  if (lower.includes('date')) {
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { text: `Today is ${date}, sir.`, success: true };
  }
  if (lower.includes('storage') || lower.includes('space')) {
    const result = await getStorageInfo();
    return { text: result, success: true };
  }
  if (lower.includes('who are you') || lower.includes('your name')) {
    return { text: "I'm Jarvis, sir. Your personal AI assistant, powered by Claude.", success: true };
  }
  if (lower.includes('help') || lower.includes('what can you do')) {
    const apps = getAvailableApps().slice(0, 10).join(', ');
    return { text: `I can organise files, open apps (${apps}), check the time, storage, and more. Just say the word, sir.`, success: true };
  }
  return { text: getSmallTalkResponse(text), success: true };
}

function getSmallTalkResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    const g = ["At your service, sir. What do you need?", "Hello, sir. Ready when you are.", "Good to hear from you, sir."];
    return g[Math.floor(Math.random() * g.length)];
  }
  if (lower.includes('thank')) {
    return "My pleasure, sir. Anything else?";
  }
  if (lower.includes('good morning')) return "Good morning, sir. What's on the agenda?";
  if (lower.includes('good night')) return "Goodnight, sir. I'll be here when you need me.";
  const f = [
    "I'm not entirely sure what you need, sir. Try saying 'help' to see what I can do.",
    "I didn't quite catch that, sir. Try 'organise my files' or 'open YouTube'.",
  ];
  return f[Math.floor(Math.random() * f.length)];
}
