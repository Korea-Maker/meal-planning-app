/**
 * Empty module to replace react-native-screens
 * This avoids New Architecture codegen issues with RN 0.79
 */

// Mock enableScreens function
export const enableScreens = () => {};

// Mock Screen components
export const Screen = () => null;
export const ScreenContainer = ({ children }) => children;
export const NativeScreen = () => null;
export const NativeScreenContainer = ({ children }) => children;
export const ScreenStack = ({ children }) => children;
export const ScreenStackHeaderConfig = () => null;

// Default export
export default {
  enableScreens,
  Screen,
  ScreenContainer,
  NativeScreen,
  NativeScreenContainer,
  ScreenStack,
  ScreenStackHeaderConfig,
};
