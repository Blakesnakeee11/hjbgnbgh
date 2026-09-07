import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceState } from '../hooks/useVoiceRecognition';

interface JarvisHeaderProps {
  voiceState: VoiceState;
}

export function JarvisHeader({ voiceState }: JarvisHeaderProps) {
  const arcRotation = useRef(new Animated.Value(0)).current;
  const coreGlow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(arcRotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(coreGlow, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const spin = arcRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = arcRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const statusText =
    voiceState === 'listening' ? 'LISTENING...' :
    voiceState === 'processing' ? 'PROCESSING...' :
    'ONLINE';

  const statusColor =
    voiceState === 'listening' ? '#FF3B30' :
    voiceState === 'processing' ? '#FF9500' :
    '#00D4FF';

  return (
    <View style={styles.container}>
      <View style={styles.reactorContainer}>
        <Animated.View style={[styles.arcRing, styles.outerArc, { transform: [{ rotate: spin }] }]}>
          <View style={[styles.arcSegment, styles.arcTop]} />
          <View style={[styles.arcSegment, styles.arcBottom]} />
        </Animated.View>

        <Animated.View style={[styles.arcRing, styles.innerArc, { transform: [{ rotate: reverseSpin }] }]}>
          <View style={[styles.arcSegment, styles.arcLeft]} />
          <View style={[styles.arcSegment, styles.arcRight]} />
        </Animated.View>

        <Animated.View style={[styles.core, { opacity: coreGlow }]}>
          <Ionicons name="flash" size={24} color="#00D4FF" />
        </Animated.View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>J.A.R.V.I.S.</Text>
        <Text style={styles.subtitle}>Just A Rather Very Intelligent System</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 50,
  },
  reactorContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  arcRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerArc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  innerArc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  arcSegment: {
    position: 'absolute',
    backgroundColor: '#00D4FF',
  },
  arcTop: {
    top: -2,
    width: 24,
    height: 2,
    alignSelf: 'center',
  },
  arcBottom: {
    bottom: -2,
    width: 24,
    height: 2,
    alignSelf: 'center',
  },
  arcLeft: {
    left: -1.5,
    width: 1.5,
    height: 16,
    alignSelf: 'center',
  },
  arcRight: {
    right: -1.5,
    width: 1.5,
    height: 16,
    alignSelf: 'center',
  },
  core: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 2,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
