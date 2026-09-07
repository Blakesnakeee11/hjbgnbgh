import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  command: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'folder-open', label: 'Organize Files', command: 'organize my files', color: '#FF9500' },
  { icon: 'camera', label: 'Camera', command: 'open camera', color: '#FF3B30' },
  { icon: 'musical-notes', label: 'Spotify', command: 'open spotify', color: '#1DB954' },
  { icon: 'logo-youtube', label: 'YouTube', command: 'open youtube', color: '#FF0000' },
  { icon: 'settings', label: 'Settings', command: 'open settings', color: '#8E8E93' },
  { icon: 'add-circle', label: 'New Folder', command: 'create a folder', color: '#007AFF' },
  { icon: 'images', label: 'Photos', command: 'open photos', color: '#FF2D55' },
  { icon: 'time', label: 'Time', command: 'what time is it', color: '#5856D6' },
];

interface QuickActionsProps {
  onAction: (command: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_ACTIONS.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={() => onAction(action.command)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 2,
    marginLeft: 20,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    width: 72,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  actionLabel: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 6,
    textAlign: 'center',
  },
});
