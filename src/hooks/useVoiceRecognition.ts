import { useState, useCallback, useEffect, useRef } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing';

interface UseVoiceRecognitionReturn {
  state: VoiceState;
  transcript: string;
  partialTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
  audioLevel: number;
}

let SpeechModule: any = null;
try {
  SpeechModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  // Native module not available
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const available = useRef(false);

  useEffect(() => {
    if (!SpeechModule) return;

    const subs: Array<{ remove: () => void }> = [];

    try {
      subs.push(
        SpeechModule.addListener('start', () => {
          setState('listening');
          setPartialTranscript('');
          setError(null);
        })
      );

      subs.push(
        SpeechModule.addListener('result', (event: any) => {
          const text = event.results[0]?.transcript || '';
          if (event.isFinal) {
            setTranscript(text);
            setPartialTranscript('');
            setState('idle');
            setAudioLevel(0);
          } else {
            setPartialTranscript(text);
          }
        })
      );

      subs.push(
        SpeechModule.addListener('end', () => {
          setState('idle');
          setAudioLevel(0);
          setPartialTranscript('');
        })
      );

      subs.push(
        SpeechModule.addListener('error', (event: any) => {
          if (event.error === 'no-speech') {
            setError("I didn't hear anything, sir. Try again.");
          } else if (event.error === 'not-allowed') {
            setError('Microphone permission is required, sir.');
          } else if (event.error === 'network') {
            setError('Network issue with speech recognition, sir.');
          } else {
            setError(`Speech error: ${event.message}`);
          }
          setState('idle');
          setAudioLevel(0);
        })
      );

      subs.push(
        SpeechModule.addListener('volumechange', (event: any) => {
          const normalized = Math.max(0, Math.min(1, (event.value + 2) / 12));
          setAudioLevel(normalized);
        })
      );

      available.current = true;
    } catch {
      available.current = false;
    }

    return () => {
      subs.forEach(s => { try { s.remove(); } catch {} });
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!available.current || !SpeechModule) {
      setError('Speech recognition is not available on this device, sir. Use the text input instead.');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setPartialTranscript('');

      const { granted } = await SpeechModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required, sir. Please enable it in Settings.');
        return;
      }

      const canRecognize = await SpeechModule.isRecognitionAvailable();
      if (!canRecognize) {
        setError('Speech recognition is not available on this device, sir.');
        return;
      }

      SpeechModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setError('Failed to start listening. Use the text input instead, sir.');
      setState('idle');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!SpeechModule) return;
    try {
      SpeechModule.stop();
    } catch {
      setState('idle');
    }
  }, []);

  return {
    state,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    error,
    audioLevel,
  };
}
