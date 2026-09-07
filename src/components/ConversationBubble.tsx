import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConversationEntry } from '../types';

interface ConversationBubbleProps {
  entry: ConversationEntry;
}

export function ConversationBubble({ entry }: ConversationBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isJarvis = entry.role === 'jarvis';
  const timeStr = entry.timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Animated.View
      style={[
        styles.container,
        isJarvis ? styles.jarvisContainer : styles.userContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {isJarvis && (
        <View style={styles.avatarContainer}>
          <View style={styles.jarvisAvatar}>
            <Ionicons name="hardware-chip" size={16} color="#00D4FF" />
          </View>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isJarvis ? styles.jarvisBubble : styles.userBubble,
        ]}
      >
        {isJarvis && (
          <Text style={styles.jarvisLabel}>JARVIS</Text>
        )}
        <Text style={[styles.text, isJarvis ? styles.jarvisText : styles.userText]}>
          {entry.text}
        </Text>
        <Text style={[styles.time, isJarvis ? styles.jarvisTime : styles.userTime]}>
          {timeStr}
        </Text>
      </View>

      {!isJarvis && (
        <View style={styles.avatarContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  jarvisContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginBottom: 4,
  },
  jarvisAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  jarvisBubble: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  jarvisLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00D4FF',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  jarvisText: {
    color: '#E0E0E0',
  },
  userText: {
    color: '#FFFFFF',
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  jarvisTime: {
    color: '#666',
    textAlign: 'left',
  },
  userTime: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
});
