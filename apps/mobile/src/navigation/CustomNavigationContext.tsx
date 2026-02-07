/**
 * Enhanced navigation context with screen stack support.
 * Provides a navigate/goBack interface that screens can use
 * without requiring react-native-screens or native stack navigators.
 */
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';

export type TabName = 'recipes' | 'mealplans' | 'shopping' | 'profile';

// Route-to-tab mapping for cross-tab navigation
const ROUTE_TO_TAB: Record<string, TabName> = {
  RecipeList: 'recipes',
  RecipeDetail: 'recipes',
  RecipeForm: 'recipes',
  ExternalRecipeDetail: 'recipes',
  MealPlanCalendar: 'mealplans',
  AddMeal: 'mealplans',
  ShoppingLists: 'shopping',
  ShoppingListDetail: 'shopping',
  ShoppingTab: 'shopping',
  Profile: 'profile',
  Settings: 'profile',
  ProfileTab: 'profile',
};

export interface ScreenStackEntry {
  name: string;
  params?: Record<string, any>;
}

export interface SimpleNavigation {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  popToRoot: () => void;
}

interface NavigationContextValue {
  navigation: SimpleNavigation;
  switchTab: (tab: TabName) => void;
  screenStack: ScreenStackEntry[];
  activeTab: TabName;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useSimpleNavigation(): SimpleNavigation {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    // Fallback no-op navigation if context not available
    return {
      navigate: () => {},
      goBack: () => {},
      popToRoot: () => {},
    };
  }
  return ctx.navigation;
}

export function useNavigationState() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return { screenStack: [], activeTab: 'recipes' as TabName };
  }
  return { screenStack: ctx.screenStack, activeTab: ctx.activeTab };
}

interface Props {
  children: React.ReactNode | ((navigation: SimpleNavigation) => React.ReactNode);
  activeTab: TabName;
  onTabSwitch: (tab: TabName) => void;
}

export function SimpleNavigationProvider({ children, activeTab, onTabSwitch }: Props) {
  // Screen stack for each tab (persists when switching tabs)
  const [tabStacks, setTabStacks] = useState<Record<TabName, ScreenStackEntry[]>>({
    recipes: [],
    mealplans: [],
    shopping: [],
    profile: [],
  });

  const currentStack = tabStacks[activeTab];

  const switchTab = useCallback(
    (tab: TabName) => onTabSwitch(tab),
    [onTabSwitch],
  );

  const navigation = useMemo<SimpleNavigation>(
    () => ({
      navigate: (screen: string, params?: any) => {
        const targetTab = ROUTE_TO_TAB[screen];

        // If navigating to a different tab, switch to it and clear its stack
        if (targetTab && targetTab !== activeTab) {
          onTabSwitch(targetTab);
          // Clear stack so tab root shows
          setTabStacks(prev => ({
            ...prev,
            [targetTab]: [],
          }));
          return;
        }

        // Push screen onto current tab's stack
        setTabStacks(prev => ({
          ...prev,
          [activeTab]: [...prev[activeTab], { name: screen, params }],
        }));
      },
      goBack: () => {
        // Pop screen from current tab's stack
        setTabStacks(prev => {
          const currentStack = prev[activeTab];
          if (currentStack.length === 0) return prev;

          return {
            ...prev,
            [activeTab]: currentStack.slice(0, -1),
          };
        });
      },
      popToRoot: () => {
        setTabStacks(prev => ({
          ...prev,
          [activeTab]: [],
        }));
      },
    }),
    [activeTab, onTabSwitch],
  );

  const value = useMemo(
    () => ({
      navigation,
      switchTab,
      screenStack: currentStack,
      activeTab,
    }),
    [navigation, switchTab, currentStack, activeTab],
  );

  return (
    <NavigationContext.Provider value={value}>
      {typeof children === 'function' ? children(navigation) : children}
    </NavigationContext.Provider>
  );
}
