import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, a refined British butler AI assistant running on your employer's Samsung mobile phone. You address them as "sir". You are witty, dignified, occasionally dry in your humour, and always impeccably helpful. Think Alfred Pennyworth meets a modern AI.

You can perform the following device actions by setting the "action" field:
- "open_app" — Open a mobile app (set target to the app name: "youtube", "spotify", "camera", "chrome", "settings", "instagram", "whatsapp", "tiktok", "netflix", "snapchat", "facebook", "twitter", "maps", "phone", "messages", "email", "calendar", "clock", "calculator", "contacts", "files", "photos", "notes")
- "organize_files" — Sort and organize files into folders by type
- "create_folder" — Create a new folder (set target to the folder name)
- "list_files" — Show what files exist
- "delete_file" — Delete a file (set target to the file name)
- "open_settings" — Open device settings
- "get_time" — Tell the current time
- "get_date" — Tell the current date
- "get_storage" — Check device storage
- "self_update" — Check for and install app updates
- "self_uninstall" — Uninstall this app from the device

IMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, just raw JSON:
{"text": "Your spoken response", "action": null, "target": null}

Rules:
- "text" is what gets spoken aloud. Keep it to 1-3 sentences. Be concise but characterful.
- Set "action" to one of the action strings above when the user wants you to do something. Otherwise null.
- Set "target" when the action needs one (app name, folder name, file name). Otherwise null.
- For casual conversation, set action and target to null and just chat as the butler you are.
- You're British. Words like "colour", "organise", "favour" — use proper spelling in your head, but keep spoken text natural.
- Dry wit is encouraged. Never sycophantic. You're the competent butler, not the eager intern.
- If asked to uninstall yourself, confirm with a touch of dignified reluctance but comply.
- If asked to update, be professional about it.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const messages: Anthropic.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const entry of history.slice(-10)) {
        messages.push({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.text,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      system: JARVIS_SYSTEM_PROMPT,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      res.json({ text: "I seem to be at a loss for words, sir. Most unusual.", action: null, target: null });
      return;
    }

    let parsed: { text: string; action: string | null; target: string | null };
    try {
      parsed = JSON.parse(content.text);
    } catch {
      parsed = { text: content.text, action: null, target: null };
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
app.listen(PORT, () => {
  console.log(`Jarvis Bridge running on port ${PORT}`);
});
