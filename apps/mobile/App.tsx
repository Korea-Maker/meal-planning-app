/**
 * Meal Planning App - React Native Mobile
 * Minimal working version without navigation
 */

import React from 'react';
import { StatusBar, StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/contexts/AuthContext';
import { colors } from './src/styles';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function MainContent() {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>🍽️ Meal Planning App</Text>
      <Text style={styles.subtitle}>iOS 앱이 성공적으로 실행되었습니다!</Text>
      <Text style={styles.info}>React Native 0.79.7</Text>
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={colors.background}
            />
            <MainContent />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default App;
