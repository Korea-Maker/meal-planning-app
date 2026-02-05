import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import type {
  MainTabParamList,
  RecipeStackParamList,
  MealPlanStackParamList,
  ShoppingStackParamList,
  ProfileStackParamList,
} from './types';
import { colors } from '../styles';

// Screens
import RecipeListScreen from '../screens/recipes/RecipeListScreen';
import RecipeDetailScreen from '../screens/recipes/RecipeDetailScreen';
import MealPlanScreen from '../screens/meal-plans/MealPlanScreen';
import ShoppingListsScreen from '../screens/shopping-lists/ShoppingListsScreen';
import ShoppingListDetailScreen from '../screens/shopping-lists/ShoppingListDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Tab icons (using simple text for now, will use vector icons later)
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();
const RecipeStack = createStackNavigator<RecipeStackParamList>();
const MealPlanStack = createStackNavigator<MealPlanStackParamList>();
const ShoppingStack = createStackNavigator<ShoppingStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Tab Icon Component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    recipes: '🍳',
    mealplans: '📅',
    shopping: '🛒',
    profile: '👤',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
        {icons[name] || '●'}
      </Text>
    </View>
  );
}

// Stack Navigators
function RecipesStackNavigator() {
  return (
    <RecipeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <RecipeStack.Screen
        name="RecipeList"
        component={RecipeListScreen}
        options={{ title: '레시피' }}
      />
      <RecipeStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: '레시피 상세' }}
      />
    </RecipeStack.Navigator>
  );
}

function MealPlansStackNavigator() {
  return (
    <MealPlanStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <MealPlanStack.Screen
        name="MealPlanCalendar"
        component={MealPlanScreen}
        options={{ title: '식사 계획' }}
      />
    </MealPlanStack.Navigator>
  );
}

function ShoppingStackNavigator() {
  return (
    <ShoppingStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <ShoppingStack.Screen
        name="ShoppingLists"
        component={ShoppingListsScreen}
        options={{ title: '장보기 목록' }}
      />
      <ShoppingStack.Screen
        name="ShoppingListDetail"
        component={ShoppingListDetailScreen}
        options={{ title: '장보기 상세' }}
      />
    </ShoppingStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '프로필' }}
      />
    </ProfileStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="RecipesTab"
        component={RecipesStackNavigator}
        options={{
          title: '레시피',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="recipes" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MealPlansTab"
        component={MealPlansStackNavigator}
        options={{
          title: '식사 계획',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="mealplans" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingStackNavigator}
        options={{
          title: '장보기',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="shopping" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: '프로필',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconTextFocused: {
    opacity: 1,
  },
});
