import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export type VoiceState = 'idle' | 'listening' | 'processing';

interface UseVoiceRecognitionReturn {
  state: VoiceState;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  error: string | null;
  audioLevel: number;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setState('listening');

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required, sir.');
        setState('idle');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;

      levelIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            setAudioLevel(normalized);
          }
        }
      }, 100);

    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      setState('idle');
    }
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    setAudioLevel(0);

    if (!recordingRef.current) {
      setState('idle');
      return '';
    }

    setState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) {
        setState('idle');
        return '';
      }

      // Since we can't do on-device STT without a cloud API,
      // we use a simulated approach for the demo.
      // In production, you'd send the audio to a speech-to-text API
      // (Google Cloud Speech, Whisper, etc.)
      const simulatedText = await simulateSTT();
      setTranscript(simulatedText);
      setState('idle');
      return simulatedText;

    } catch {
      setError('Failed to process recording.');
      setState('idle');
      return '';
    }
  }, []);

  return { state, transcript, startListening, stopListening, error, audioLevel };
}

async function simulateSTT(): Promise<string> {
  // Placeholder — in production, send recorded audio to a speech-to-text service.
  // For the demo, the app uses the text input as the primary interface,
  // with the mic button showing the recording/processing flow.
  return '';
}
