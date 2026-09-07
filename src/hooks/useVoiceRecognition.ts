import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

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

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const onFinalResult = useRef<((text: string) => void) | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setState('listening');
    setPartialTranscript('');
    setError(null);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';

    if (event.isFinal) {
      setTranscript(text);
      setPartialTranscript('');
      setState('idle');
      setAudioLevel(0);
      if (onFinalResult.current) {
        onFinalResult.current(text);
        onFinalResult.current = null;
      }
    } else {
      setPartialTranscript(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setState('idle');
    setAudioLevel(0);
    setPartialTranscript('');
  });

  useSpeechRecognitionEvent('error', (event) => {
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
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    const normalized = Math.max(0, Math.min(1, (event.value + 2) / 12));
    setAudioLevel(normalized);
  });

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setPartialTranscript('');

      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required, sir. Please enable it in Settings.');
        return;
      }

      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setError('Speech recognition is not available on this device, sir.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setError('Failed to start listening. Please try again.');
      setState('idle');
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
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
