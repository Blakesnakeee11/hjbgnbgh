import * as Speech from 'expo-speech';
import { parseCommand } from './CommandParser';
import { organizeFiles, createFolder, listFiles, deleteFile, getStorageInfo } from './FileManager';
import { openApp, openSettings, getAvailableApps } from './AppLauncher';
import { JarvisResponse, ConversationEntry } from '../types';

const JARVIS_VOICE_OPTIONS = {
  language: 'en-US',
  pitch: 0.9,
  rate: 0.95,
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

export async function processCommand(text: string): Promise<JarvisResponse> {
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
      const fileList = files.map(f => `${f.isDirectory ? '📁' : '📄'} ${f.name}`).join('\n');
      return {
        text: `Here's what's in your files, sir:\n${fileList}`,
        success: true,
      };
    }
    default: {
      const files = await listFiles();
      if (files.length === 0) {
        return { text: "Your files directory is empty at the moment, sir. I can create folders or organize files for you.", success: true };
      }
      const result = await organizeFiles();
      return { text: result, success: true };
    }
  }
}

async function handleAppCommand(action: string, target: string): Promise<JarvisResponse> {
  if (action === 'close') {
    return {
      text: "I can't close apps directly due to mobile OS restrictions, sir. But I can open anything you need.",
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
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { text: `It's currently ${time}, sir.`, success: true };
  }

  if (lower.includes('date')) {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { text: `Today is ${date}, sir.`, success: true };
  }

  if (lower.includes('storage') || lower.includes('space') || lower.includes('disk')) {
    const result = await getStorageInfo();
    return { text: result, success: true };
  }

  if (lower.includes('battery')) {
    return { text: "I can't read your battery level directly, sir, but you can check it in your status bar or settings.", success: true };
  }

  if (lower.includes('who are you') || lower.includes('your name')) {
    return {
      text: "I'm Jarvis, your personal AI assistant. I can organize your files, open apps, and help manage your device. Think of me as your pocket-sized butler, sir.",
      success: true,
    };
  }

  if (lower.includes('help') || lower.includes('what can you do')) {
    const apps = getAvailableApps().slice(0, 10).join(', ');
    return {
      text: `Here's what I can do, sir:\n\n📁 File Management — "Organize my files", "Create a folder called Work", "Show my files"\n\n📱 App Launching — "Open YouTube", "Launch Spotify", "Open Camera"\nAvailable: ${apps}, and more.\n\n⚙️ System — "Open settings"\n\n🕐 Info — "What time is it?", "How much storage do I have?"`,
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
      "Hey there. What's on the agenda?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.includes('thank')) {
    const thanks = [
      "Happy to help, sir.",
      "Anytime, sir.",
      "That's what I'm here for.",
      "Of course, sir. Anything else?",
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  if (lower.includes('good morning')) {
    return "Good morning, sir. Ready to start the day. What do you need?";
  }

  if (lower.includes('good night') || lower.includes('goodnight')) {
    return "Goodnight, sir. I'll be here when you need me.";
  }

  const fallbacks = [
    "I'm not quite sure what you need, sir. Try saying 'help' to see what I can do.",
    "I didn't catch that, sir. I can organize files, open apps, or give you system info. Just say the word.",
    "Not sure I follow, sir. Try something like 'organize my files' or 'open YouTube'.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
