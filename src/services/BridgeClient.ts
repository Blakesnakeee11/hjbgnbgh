import { BRIDGE_URL } from '../config';

export interface BridgeResponse {
  text: string;
  action: string | null;
  target: string | null;
  audioUrl: string | null;
}

interface ConversationMessage {
  role: 'user' | 'jarvis';
  text: string;
}

export async function callBridge(
  message: string,
  history: ConversationMessage[] = [],
): Promise<BridgeResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${BRIDGE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();

    if (data.audioUrl && !data.audioUrl.startsWith('http')) {
      data.audioUrl = `${BRIDGE_URL}${data.audioUrl}`;
    }

    return data as BridgeResponse;
  } catch {
    return null;
  }
}

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BRIDGE_URL}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
