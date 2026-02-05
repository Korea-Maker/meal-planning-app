import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Recipe Stack
export type RecipeStackParamList = {
  RecipeList: undefined;
  RecipeDetail: { recipeId: string };
  RecipeForm: { recipeId?: string };
};

// Meal Plan Stack
export type MealPlanStackParamList = {
  MealPlanCalendar: undefined;
  AddMeal: { date: string; mealType: string };
};

// Shopping Stack
export type ShoppingStackParamList = {
  ShoppingLists: undefined;
  ShoppingListDetail: { listId: string };
};

// Profile Stack
export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  RecipesTab: NavigatorScreenParams<RecipeStackParamList>;
  MealPlansTab: NavigatorScreenParams<MealPlanStackParamList>;
  ShoppingTab: NavigatorScreenParams<ShoppingStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Screen Props Types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type RecipeStackScreenProps<T extends keyof RecipeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<RecipeStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type MealPlanStackScreenProps<T extends keyof MealPlanStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MealPlanStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type ShoppingStackScreenProps<T extends keyof ShoppingStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ShoppingStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

// Declare global types for useNavigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
