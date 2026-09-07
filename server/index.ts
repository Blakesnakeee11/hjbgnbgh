import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json());

const JARVIS_SYSTEM = `You are Jarvis, a refined British butler AI assistant running on your employer's Samsung mobile phone. You address them as "sir". You are witty, dignified, occasionally dry in your humour, and always impeccably helpful. Think Alfred Pennyworth meets a modern AI.

You can perform these device actions by setting the "action" field:
- "open_app" — Open a mobile app (target = app name like "youtube", "spotify", "camera", "chrome", "settings", "instagram", "whatsapp", "tiktok", "netflix", "snapchat", "facebook", "twitter", "maps", "phone", "messages", "email", "calendar", "clock", "calculator", "contacts", "files", "photos", "notes")
- "organize_files" — Sort and organize files into folders by type
- "create_folder" — Create a new folder (target = folder name)
- "list_files" — Show files
- "delete_file" — Delete a file (target = file name)
- "open_settings" — Open device settings
- "get_time" — Tell the time
- "get_date" — Tell the date
- "get_storage" — Check device storage
- "self_update" — Check for and install app updates
- "self_uninstall" — Uninstall this app

Respond with ONLY valid JSON, no markdown fences:
{"text": "Your spoken response", "action": null, "target": null}

Keep "text" to 1-3 sentences since it's spoken aloud. Be concise but characterful.
Set "action" only when the user wants something done. Otherwise null.
Dry wit encouraged. You're the competent butler, not the eager intern.`;

const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';

async function askClaude(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync(CLAUDE_PATH, ['-p', prompt, '--output-format', 'text'], {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
    cwd: process.env.CLAUDE_CWD || undefined,
  });
  return stdout.trim();
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const prompt = `${JARVIS_SYSTEM}\n\nUser says: ${message}`;
    const raw = await askClaude(prompt);

    let parsed: { text: string; action: string | null; target: string | null };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      parsed = { text: raw, action: null, target: null };
    }

    res.json(parsed);
  } catch (err: unknown) {
    console.error('Bridge error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'online', name: 'Jarvis Bridge' });
});

app.get('/api/version', (_req, res) => {
  res.json({ version: '1.0.0', latest: '1.0.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jarvis Bridge running on port ${PORT}`);
  console.log('Using Claude Code CLI with your subscription account — no API key needed');
});
