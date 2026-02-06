/**
 * Minimal navigation context for custom tab-based navigation.
 * Provides a navigate/goBack interface that screens can use
 * without requiring react-native-screens or native stack navigators.
 */
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

export type TabName = 'recipes' | 'mealplans' | 'shopping' | 'profile';

// Route-to-tab mapping for cross-tab navigation
const ROUTE_TO_TAB: Record<string, TabName> = {
  RecipeList: 'recipes',
  RecipeDetail: 'recipes',
  RecipeForm: 'recipes',
  MealPlanCalendar: 'mealplans',
  AddMeal: 'mealplans',
  ShoppingLists: 'shopping',
  ShoppingListDetail: 'shopping',
  ShoppingTab: 'shopping',
  Profile: 'profile',
  Settings: 'profile',
  ProfileTab: 'profile',
};

export interface SimpleNavigation {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface NavigationContextValue {
  navigation: SimpleNavigation;
  switchTab: (tab: TabName) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useSimpleNavigation(): SimpleNavigation {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    // Fallback no-op navigation if context not available
    return {
      navigate: () => {},
      goBack: () => {},
    };
  }
  return ctx.navigation;
}

interface Props {
  children: React.ReactNode;
  activeTab: TabName;
  onTabSwitch: (tab: TabName) => void;
}

export function SimpleNavigationProvider({ children, activeTab, onTabSwitch }: Props) {
  const switchTab = useCallback(
    (tab: TabName) => onTabSwitch(tab),
    [onTabSwitch],
  );

  const navigation = useMemo<SimpleNavigation>(
    () => ({
      navigate: (screen: string, params?: any) => {
        const targetTab = ROUTE_TO_TAB[screen];
        if (targetTab) {
          onTabSwitch(targetTab);
        }
        // For sub-screens (RecipeDetail, ShoppingListDetail, AddMeal),
        // we can't navigate deeper without a stack navigator.
        // The tab switch is the best we can do for now.
      },
      goBack: () => {
        // No stack to go back to in custom tabs
      },
    }),
    [onTabSwitch],
  );

  const value = useMemo(
    () => ({ navigation, switchTab }),
    [navigation, switchTab],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}
