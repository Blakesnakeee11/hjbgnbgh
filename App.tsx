import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Jarvis encountered an error</Text>
          <Text style={styles.errorMsg}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <HomeScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMsg: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
  },
});
