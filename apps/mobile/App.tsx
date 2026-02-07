/**
 * Meal Planning App - React Native Mobile
 * Uses custom tab navigation with real screen components.
 * react-native-screens is not used due to RN 0.79 New Architecture incompatibility.
 */

import React from 'react';
import { StatusBar, StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SimpleNavigationProvider, useNavigationState, type TabName } from './src/navigation/CustomNavigationContext';
import { colors, spacing } from './src/styles';

// Tab screen components
import RecipeListScreen from './src/screens/recipes/RecipeListScreen';
import MealPlanScreen from './src/screens/meal-plans/MealPlanScreen';
import ShoppingListsScreen from './src/screens/shopping-lists/ShoppingListsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

// Detail screen components
import RecipeDetailScreen from './src/screens/recipes/RecipeDetailScreen';
import RecipeFormScreen from './src/screens/recipes/RecipeFormScreen';
import ExternalRecipeDetailScreen from './src/screens/recipes/ExternalRecipeDetailScreen';
import AddMealScreen from './src/screens/meal-plans/AddMealScreen';
import ShoppingListDetailScreen from './src/screens/shopping-lists/ShoppingListDetailScreen';

// Auth screen components
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

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

// Detail screen renderer based on navigation stack
function DetailScreenRenderer({ screenName, params }: { screenName: string; params?: Record<string, any> }) {
  const route = { params: params || {} };
  switch (screenName) {
    case 'RecipeDetail':
      return <RecipeDetailScreen route={route as any} />;
    case 'RecipeForm':
      return <RecipeFormScreen route={route as any} />;
    case 'ExternalRecipeDetail':
      return <ExternalRecipeDetailScreen route={route as any} />;
    case 'AddMeal':
      return <AddMealScreen route={route as any} />;
    case 'ShoppingListDetail':
      return <ShoppingListDetailScreen route={route as any} />;
    default:
      return null;
  }
}

// Content renderer for tab screens + detail screens
function ContentRenderer({ activeTab }: { activeTab: TabName }) {
  const { screenStack } = useNavigationState();

  // If there's a detail screen on the stack, render it instead of the tab screen
  if (screenStack.length > 0) {
    const topScreen = screenStack[screenStack.length - 1];
    return <DetailScreenRenderer screenName={topScreen.name} params={topScreen.params} />;
  }

  // Default: render the tab's main screen
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
}

// Auth gate - shows login/register or main app based on auth state
function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = React.useState<'login' | 'register'>('login');

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    return authScreen === 'login' ? (
      <LoginScreen onSwitchToRegister={() => setAuthScreen('register')} />
    ) : (
      <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} />
    );
  }

  // Show main app content if authenticated
  return <MainContent />;
}

// Main app content with custom tab navigation
function MainContent() {
  const [activeTab, setActiveTab] = React.useState<TabName>('recipes');
  const navigationRef = React.useRef<any>(null);

  return (
    <SimpleNavigationProvider activeTab={activeTab} onTabSwitch={setActiveTab}>
      {(navigation) => {
        navigationRef.current = navigation;
        return (
          <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🍽️ Meal Planning</Text>
            </View>

            {/* Content - renders based on active tab */}
            <View style={styles.content}>
              <ContentRenderer activeTab={activeTab} />
            </View>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
              <TabButton
                label="레시피"
                icon="🍳"
                isActive={activeTab === 'recipes'}
                onPress={() => {
                  if (activeTab === 'recipes') {
                    navigation.popToRoot();
                  } else {
                    setActiveTab('recipes');
                  }
                }}
              />
              <TabButton
                label="식사계획"
                icon="📅"
                isActive={activeTab === 'mealplans'}
                onPress={() => {
                  if (activeTab === 'mealplans') {
                    navigation.popToRoot();
                  } else {
                    setActiveTab('mealplans');
                  }
                }}
              />
              <TabButton
                label="장보기"
                icon="🛒"
                isActive={activeTab === 'shopping'}
                onPress={() => {
                  if (activeTab === 'shopping') {
                    navigation.popToRoot();
                  } else {
                    setActiveTab('shopping');
                  }
                }}
              />
              <TabButton
                label="프로필"
                icon="👤"
                isActive={activeTab === 'profile'}
                onPress={() => {
                  if (activeTab === 'profile') {
                    navigation.popToRoot();
                  } else {
                    setActiveTab('profile');
                  }
                }}
              />
            </View>
          </View>
        );
      }}
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
            <AuthGate />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
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
