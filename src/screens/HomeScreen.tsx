import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { JarvisHeader } from '../components/JarvisHeader';
import { VoiceButton } from '../components/VoiceButton';
import { ConversationBubble } from '../components/ConversationBubble';
import { QuickActions } from '../components/QuickActions';
import { CommandTextInput } from '../components/TextInput';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { processCommand, speak, stopSpeaking, createEntry } from '../services/JarvisEngine';
import { ConversationEntry } from '../types';

export function HomeScreen() {
  const [conversation, setConversation] = useState<ConversationEntry[]>([
    createEntry('jarvis', "Good day, sir. I'm Jarvis, your personal AI assistant. I can organise your files, open apps, manage your device, and hold a proper conversation. Just speak or type a command."),
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const voice = useVoiceRecognition();
  const hasProcessedTranscript = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleCommand = useCallback(async (text: string) => {
    if (isProcessing || !text.trim()) return;

    stopSpeaking();
    setIsProcessing(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userEntry = createEntry('user', text);
    setConversation(prev => [...prev, userEntry]);
    scrollToBottom();

    try {
      const response = await processCommand(text);

      const jarvisEntry = createEntry('jarvis', response.text);
      setConversation(prev => [...prev, jarvisEntry]);
      scrollToBottom();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await speak(response.text);

      if (response.action) {
        await response.action();
      }
    } catch {
      const errorEntry = createEntry('jarvis', "Something went wrong, sir. Could you try that again?");
      setConversation(prev => [...prev, errorEntry]);
      scrollToBottom();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, scrollToBottom]);

  // When we get a final transcript from speech recognition, process it
  useEffect(() => {
    if (voice.transcript && !hasProcessedTranscript.current) {
      hasProcessedTranscript.current = true;
      handleCommand(voice.transcript);
    }
  }, [voice.transcript, handleCommand]);

  const handleVoicePress = useCallback(async () => {
    if (voice.state === 'listening') {
      voice.stopListening();
    } else if (voice.state === 'idle' && !isProcessing) {
      hasProcessedTranscript.current = false;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await voice.startListening();
    }
  }, [voice.state, isProcessing]);

  const handleQuickAction = useCallback((command: string) => {
    handleCommand(command);
  }, [handleCommand]);

  const renderItem = useCallback(({ item }: { item: ConversationEntry }) => (
    <ConversationBubble entry={item} />
  ), []);

  const keyExtractor = useCallback((item: ConversationEntry) => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />

      <JarvisHeader voiceState={voice.state} />

      <QuickActions onAction={handleQuickAction} />

      <KeyboardAvoidingView
        style={styles.conversationContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={conversation}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.conversationList}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Live transcript preview while listening */}
        {voice.state === 'listening' && voice.partialTranscript ? (
          <View style={styles.liveTranscript}>
            <Text style={styles.liveTranscriptLabel}>HEARING:</Text>
            <Text style={styles.liveTranscriptText}>{voice.partialTranscript}</Text>
          </View>
        ) : null}

        {voice.error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{voice.error}</Text>
          </View>
        ) : null}

        <View style={styles.inputArea}>
          <CommandTextInput
            onSubmit={handleCommand}
            disabled={isProcessing || voice.state === 'listening'}
          />

          <VoiceButton
            state={voice.state}
            onPress={handleVoicePress}
            audioLevel={voice.audioLevel}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  conversationContainer: {
    flex: 1,
  },
  conversationList: {
    flex: 1,
  },
  conversationContent: {
    paddingVertical: 8,
  },
  liveTranscript: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  liveTranscriptLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00D4FF',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  liveTranscriptText: {
    fontSize: 15,
    color: '#E0E0E0',
    fontStyle: 'italic',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B5B',
    textAlign: 'center',
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: '#0D0D1A',
  },
});
