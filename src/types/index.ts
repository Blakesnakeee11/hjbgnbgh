export type CommandCategory = 'files' | 'apps' | 'system' | 'info' | 'unknown';

export interface ParsedCommand {
  category: CommandCategory;
  action: string;
  target: string;
  rawText: string;
  confidence: number;
}

export interface JarvisResponse {
  text: string;
  action?: () => Promise<void>;
  success: boolean;
  audioUrl?: string | null;
}

export interface ConversationEntry {
  id: string;
  role: 'user' | 'jarvis';
  text: string;
  timestamp: Date;
  category?: CommandCategory;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedTime?: string;
}

export interface AppInfo {
  name: string;
  packageName: string;
  icon?: string;
}
