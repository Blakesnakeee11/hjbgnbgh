import { useState, useCallback } from 'react';

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
  const [state] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(async () => {
    setError('Voice input coming soon, sir. Use the text box for now.');
  }, []);

  const stopListening = useCallback(() => {}, []);

  return {
    state,
    transcript: '',
    partialTranscript: '',
    startListening,
    stopListening,
    error,
    audioLevel: 0,
  };
}
