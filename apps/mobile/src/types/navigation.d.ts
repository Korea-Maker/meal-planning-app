// Fix for React Navigation v6 JSX component type errors
// This is a known compatibility issue between @types/react 18.2+ and React Navigation

import type { ReactElement } from 'react';

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<ParamList extends Record<string, object | undefined>>(): {
    Navigator: (props: any) => ReactElement | null;
    Screen: (props: any) => ReactElement | null;
    Group: (props: any) => ReactElement | null;
  };
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<ParamList extends Record<string, object | undefined>>(): {
    Navigator: (props: any) => ReactElement | null;
    Screen: (props: any) => ReactElement | null;
    Group: (props: any) => ReactElement | null;
  };
}
