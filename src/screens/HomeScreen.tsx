import React, { useState, useRef, useCallback } from 'react';
import {
  View,
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
    createEntry('jarvis', "Good day, sir. I'm Jarvis, your personal assistant. I can organize your files, open apps, and help manage your device. Just speak or type a command."),
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const voice = useVoiceRecognition();

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

  const handleVoicePress = useCallback(async () => {
    if (voice.state === 'listening') {
      const transcript = await voice.stopListening();
      if (transcript) {
        await handleCommand(transcript);
      } else {
        const entry = createEntry('jarvis', "I didn't catch that, sir. You can also type your command below.");
        setConversation(prev => [...prev, entry]);
        scrollToBottom();
      }
    } else if (voice.state === 'idle') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await voice.startListening();
    }
  }, [voice.state, handleCommand, scrollToBottom]);

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

        <View style={styles.inputArea}>
          <CommandTextInput
            onSubmit={handleCommand}
            disabled={isProcessing}
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
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: '#0D0D1A',
  },
});
