import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceState } from '../hooks/useVoiceRecognition';

interface VoiceButtonProps {
  state: VoiceState;
  onPress: () => void;
  audioLevel: number;
}

export function VoiceButton({ state, onPress, audioLevel }: VoiceButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15 + audioLevel * 0.2,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else if (state === 'processing') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [state, audioLevel]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const buttonColor =
    state === 'listening' ? '#FF3B30' :
    state === 'processing' ? '#FF9500' :
    '#007AFF';

  const iconName =
    state === 'listening' ? 'stop' :
    state === 'processing' ? 'hourglass-outline' :
    'mic';

  return (
    <View style={styles.container}>
      {state === 'listening' && (
        <>
          <Animated.View
            style={[
              styles.glowRing,
              styles.glowOuter,
              { opacity: glowOpacity, borderColor: '#FF3B30' },
            ]}
          />
          <Animated.View
            style={[
              styles.glowRing,
              styles.glowMiddle,
              { opacity: glowOpacity, borderColor: '#FF6B5B' },
            ]}
          />
        </>
      )}

      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [
              { scale: pulseAnim },
              ...(state === 'processing' ? [{ rotate: spin }] : []),
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Ionicons name={iconName} size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {state === 'listening' && (
        <View style={styles.levelIndicator}>
          {[...Array(5)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.levelBar,
                {
                  height: 8 + audioLevel * 20 * (i % 2 === 0 ? 1.2 : 0.8),
                  backgroundColor: audioLevel > 0.3 ? '#FF3B30' : '#FF6B5B',
                  opacity: audioLevel > i * 0.2 ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  buttonWrapper: {
    zIndex: 2,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    zIndex: 1,
  },
  glowOuter: {
    width: 110,
    height: 110,
  },
  glowMiddle: {
    width: 94,
    height: 94,
  },
  levelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    height: 30,
  },
  levelBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 8,
  },
});
