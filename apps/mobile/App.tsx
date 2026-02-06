/**
 * Meal Planning App - React Native Mobile
 * Uses custom tab navigation with real screen components.
 * react-native-screens is not used due to RN 0.79 New Architecture incompatibility.
 */

import React from 'react';
import { StatusBar, StyleSheet, View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/contexts/AuthContext';
import { SimpleNavigationProvider, type TabName } from './src/navigation/CustomNavigationContext';
import { colors } from './src/styles';

// Screen components
import RecipeListScreen from './src/screens/recipes/RecipeListScreen';
import MealPlanScreen from './src/screens/meal-plans/MealPlanScreen';
import ShoppingListsScreen from './src/screens/shopping-lists/ShoppingListsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

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

// Main app content with custom tab navigation
function MainContent() {
  const [activeTab, setActiveTab] = React.useState<TabName>('recipes');

  const renderContent = () => {
    switch (activeTab) {
      case 'recipes':
        return <RecipeListScreen />;
      case 'mealplans':
        return <MealPlanScreen />;
      case 'shopping':
        return <ShoppingListsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return null;
    }
  };

  return (
    <SimpleNavigationProvider activeTab={activeTab} onTabSwitch={setActiveTab}>
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🍽️ Meal Planning</Text>
        </View>

        {/* Content - each screen manages its own scrolling */}
        <View style={styles.content}>
          {renderContent()}
        </View>

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
    </SimpleNavigationProvider>
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
