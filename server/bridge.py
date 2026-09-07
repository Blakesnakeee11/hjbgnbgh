"""Jarvis Bridge Server — Claude AI + Kokoro TTS (bm_lewis voice).

Runs on your PC. The Jarvis phone app sends commands here, this server
gets Claude's response via the CLI, synthesizes speech with Kokoro,
and sends both the text and audio back to the phone.
"""
import http.server
import json
import os
import re
import subprocess
import tempfile
import threading
import uuid

import numpy as np

VOICE = "bm_lewis"
AGENT_DIR = os.environ.get("AGENT_DIR", r"C:\Users\blake\my-agent")
PORT = int(os.environ.get("PORT", "3000"))

_audio_dir = tempfile.mkdtemp(prefix="jarvis_audio_")
_pipe = None
_pipe_lock = threading.Lock()

SYSTEM_PROMPT = """\
You are Jarvis, a refined British butler AI assistant running on your \
employer's Samsung mobile phone. You address them as "sir". You are witty, \
dignified, occasionally dry in your humour, and always impeccably helpful. \
Think Alfred Pennyworth meets a modern AI.

You can perform these device actions by setting the "action" field:
- "open_app" — Open a mobile app (target = app name like "youtube", \
"spotify", "camera", "chrome", "settings", "instagram", "whatsapp", \
"tiktok", "netflix", "snapchat", "facebook", "twitter", "maps", "phone", \
"messages", "email", "calendar", "clock", "calculator", "contacts", \
"files", "photos", "notes")
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

Keep "text" to 1-3 sentences since it's spoken aloud. Be concise but \
characterful. Set "action" only when the user wants something done. \
Dry wit encouraged. You're the competent butler, not the eager intern."""


def _ensure_espeak():
    if os.environ.get("PHONEMIZER_ESPEAK_LIBRARY"):
        return
    candidates = (
        r"C:\Program Files\eSpeak NG\libespeak-ng.dll",
        r"C:\Program Files (x86)\eSpeak NG\libespeak-ng.dll",
        "/opt/homebrew/lib/libespeak-ng.dylib",
        "/usr/local/lib/libespeak-ng.dylib",
        "/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1",
        "/usr/lib/libespeak-ng.so.1",
    )
    for lib in candidates:
        if os.path.exists(lib):
            os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = lib
            break


def warm_voice():
    global _pipe
    with _pipe_lock:
        if _pipe is None:
            _ensure_espeak()
            from kokoro import KPipeline

            lang = VOICE[0]  # 'b' for British
            print(f"[jarvis] Loading Kokoro voice ({VOICE})...")
            _pipe = KPipeline(lang_code=lang)
            print("[jarvis] Voice ready")
    return _pipe


def synthesize(text):
    import soundfile as sf

    pipe = warm_voice()
    chunks = []
    for _, _, audio in pipe(text, voice=VOICE, speed=1.0):
        a = np.asarray(audio, dtype=np.float32)
        if a.size:
            chunks.append(a)
    if not chunks:
        return None
    audio_id = uuid.uuid4().hex
    path = os.path.join(_audio_dir, f"{audio_id}.wav")
    sf.write(path, np.concatenate(chunks), 24000)
    return audio_id


def ask_claude(message):
    prompt = f"{SYSTEM_PROMPT}\n\nUser says: {message}"
    result = subprocess.run(
        ["claude", "-p", prompt, "--output-format", "text"],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=AGENT_DIR,
    )
    return result.stdout.strip()


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        body = json.dumps(data).encode()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            self._json({"status": "online", "name": "Jarvis Bridge", "voice": "kokoro"})
        elif self.path.startswith("/api/audio/"):
            audio_id = self.path.split("/")[-1].replace(".wav", "")
            # Sanitize — hex only
            if not re.match(r"^[0-9a-f]+$", audio_id):
                self._json({"error": "Invalid id"}, 400)
                return
            path = os.path.join(_audio_dir, f"{audio_id}.wav")
            if os.path.exists(path):
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self._cors()
                with open(path, "rb") as f:
                    data = f.read()
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                # Clean up after serving
                try:
                    os.unlink(path)
                except OSError:
                    pass
            else:
                self._json({"error": "Not found"}, 404)
        else:
            self._json({"error": "Not found"}, 404)

    def do_POST(self):
        if self.path == "/api/chat":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            message = body.get("message", "")
            if not message:
                self._json({"error": "Message required"}, 400)
                return

            raw = ask_claude(message)
            try:
                match = re.search(r"\{[\s\S]*\}", raw)
                parsed = json.loads(match.group(0) if match else raw)
            except Exception:
                parsed = {"text": raw, "action": None, "target": None}

            # Generate audio with Kokoro
            try:
                audio_id = synthesize(parsed.get("text", ""))
                if audio_id:
                    parsed["audioUrl"] = f"/api/audio/{audio_id}"
            except Exception as e:
                print(f"[jarvis] TTS error: {e}")

            self._json(parsed)
        else:
            self._json({"error": "Not found"}, 404)

    def log_message(self, fmt, *args):
        if "/api/audio/" not in (args[0] if args else ""):
            print(f"[jarvis] {args[0]}" if args else "")


if __name__ == "__main__":
    print("=" * 44)
    print("  Jarvis Bridge Server")
    print(f"  Voice: Kokoro ({VOICE})")
    print(f"  Agent: {AGENT_DIR}")
    print("=" * 44)
    print()
    threading.Thread(target=warm_voice, daemon=True).start()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Listening on port {PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
