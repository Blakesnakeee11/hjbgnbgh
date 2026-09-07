import { ParsedCommand, CommandCategory } from '../types';

const FILE_KEYWORDS = [
  'organize', 'sort', 'move', 'delete', 'rename', 'create folder',
  'make folder', 'clean up', 'files', 'folder', 'directory',
  'arrange', 'group', 'categorize', 'tidy', 'clean',
];

const APP_KEYWORDS = [
  'open', 'launch', 'start', 'run', 'close', 'switch to',
  'go to', 'show me', 'pull up',
];

const SYSTEM_KEYWORDS = [
  'volume', 'brightness', 'wifi', 'bluetooth', 'battery',
  'settings', 'notification', 'airplane', 'flashlight', 'torch',
  'silent', 'vibrate', 'do not disturb', 'dark mode', 'screen',
];

const INFO_KEYWORDS = [
  'what time', 'what date', 'weather', 'how much storage',
  'battery level', 'who are you', 'help', 'what can you do',
  'status', 'tell me',
];

function matchKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) matches++;
  }
  return matches;
}

function extractTarget(text: string, category: CommandCategory): string {
  const lower = text.toLowerCase();

  if (category === 'apps') {
    const appPatterns = [
      /(?:open|launch|start|run|switch to|go to|pull up|show me)\s+(.+)/i,
    ];
    for (const pattern of appPatterns) {
      const match = lower.match(pattern);
      if (match) return match[1].trim();
    }
  }

  if (category === 'files') {
    const filePatterns = [
      /(?:organize|sort|clean|tidy|arrange|group|categorize)\s+(?:my\s+)?(.+)/i,
      /(?:create|make)\s+(?:a\s+)?folder\s+(?:called\s+|named\s+)?(.+)/i,
      /(?:move|rename|delete)\s+(.+)/i,
    ];
    for (const pattern of filePatterns) {
      const match = lower.match(pattern);
      if (match) return match[1].trim();
    }
  }

  return text;
}

function extractAction(text: string, category: CommandCategory): string {
  const lower = text.toLowerCase();

  const actionMap: Record<string, string[]> = {
    organize: ['organize', 'sort', 'arrange', 'group', 'categorize', 'tidy', 'clean up'],
    open: ['open', 'launch', 'start', 'run', 'go to', 'pull up', 'show me', 'switch to'],
    create: ['create', 'make', 'new'],
    delete: ['delete', 'remove', 'trash'],
    move: ['move', 'transfer'],
    rename: ['rename'],
    close: ['close', 'quit', 'exit', 'kill'],
    info: ['what', 'how', 'tell', 'who', 'status', 'help'],
    toggle: ['turn on', 'turn off', 'enable', 'disable', 'toggle'],
  };

  for (const [action, keywords] of Object.entries(actionMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return action;
    }
  }

  return 'unknown';
}

export function parseCommand(text: string): ParsedCommand {
  const scores: Record<CommandCategory, number> = {
    files: matchKeywords(text, FILE_KEYWORDS),
    apps: matchKeywords(text, APP_KEYWORDS),
    system: matchKeywords(text, SYSTEM_KEYWORDS),
    info: matchKeywords(text, INFO_KEYWORDS),
    unknown: 0,
  };

  let bestCategory: CommandCategory = 'unknown';
  let bestScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat as CommandCategory;
    }
  }

  const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1) : 0;

  return {
    category: bestCategory,
    action: extractAction(text, bestCategory),
    target: extractTarget(text, bestCategory),
    rawText: text,
    confidence,
  };
}
