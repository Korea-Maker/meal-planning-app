import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, User } from '@meal-planning/shared-types';

const KEYS = {
  TOKENS: '@meal_planning/tokens',
  USER: '@meal_planning/user',
} as const;

export const storage = {
  // Token management
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const value = await AsyncStorage.getItem(KEYS.TOKENS);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TOKENS, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.TOKENS);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  // User management
  async getUser(): Promise<User | null> {
    try {
      const value = await AsyncStorage.getItem(KEYS.USER);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEYS.TOKENS, KEYS.USER]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
