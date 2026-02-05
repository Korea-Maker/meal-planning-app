/**
 * Meal Planning App - React Native Mobile
 * Working version without navigation (react-native-screens RN 0.79 compatibility issue)
 * Navigation will be added when react-native-screens supports RN 0.79 New Architecture
 */

import React from 'react';
import { StatusBar, StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
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

// Tab button component
function TabButton({ label, icon, isActive, onPress }: {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Main app content with simple tab-like navigation
function MainContent() {
  const [activeTab, setActiveTab] = React.useState<'recipes' | 'mealplans' | 'shopping' | 'profile'>('recipes');
  const { isAuthenticated, logout } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'recipes':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>🍳 레시피</Text>
            <Text style={styles.sectionDescription}>맛있는 레시피를 검색하고 저장하세요</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>레시피 목록이 여기에 표시됩니다</Text>
            </View>
          </View>
        );
      case 'mealplans':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>📅 식사 계획</Text>
            <Text style={styles.sectionDescription}>주간 식사 계획을 관리하세요</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>식사 계획 캘린더가 여기에 표시됩니다</Text>
            </View>
          </View>
        );
      case 'shopping':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>🛒 장보기 목록</Text>
            <Text style={styles.sectionDescription}>필요한 재료를 확인하세요</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>장보기 목록이 여기에 표시됩니다</Text>
            </View>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>👤 프로필</Text>
            <Text style={styles.sectionDescription}>계정 설정을 관리하세요</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.infoText}>인증 상태: {isAuthenticated ? '로그인됨' : '로그아웃됨'}</Text>
              {isAuthenticated && (
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                  <Text style={styles.logoutButtonText}>로그아웃</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Meal Planning</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderContent()}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="레시피"
          icon="🍳"
          isActive={activeTab === 'recipes'}
          onPress={() => setActiveTab('recipes')}
        />
        <TabButton
          label="식사계획"
          icon="📅"
          isActive={activeTab === 'mealplans'}
          onPress={() => setActiveTab('mealplans')}
        />
        <TabButton
          label="장보기"
          icon="🛒"
          isActive={activeTab === 'shopping'}
          onPress={() => setActiveTab('shopping')}
        />
        <TabButton
          label="프로필"
          icon="👤"
          isActive={activeTab === 'profile'}
          onPress={() => setActiveTab('profile')}
        />
      </View>
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
  mainContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  placeholder: {
    backgroundColor: colors.card,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  profileInfo: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabButtonActive: {
    // Active state handled by text styles
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default App;
