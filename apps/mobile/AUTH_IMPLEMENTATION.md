# Authentication Implementation for React Native Mobile App

## Overview
Added authentication screens and auth gate to the mobile app to prevent unauthorized access.

## Changes Made

### 1. Updated Auth Screens (src/screens/auth/)
- **LoginScreen.tsx**: Removed react-navigation dependency, now accepts `onSwitchToRegister` callback
- **RegisterScreen.tsx**: Removed react-navigation dependency, now accepts `onSwitchToLogin` callback

Both screens now work without react-navigation stack, using simple prop callbacks for screen switching.

### 2. Updated App.tsx
Added new `AuthGate` component that:
- Shows loading spinner while checking authentication status
- Shows LoginScreen or RegisterScreen when user is not authenticated
- Shows main app content (tabs) when user is authenticated
- Uses simple React state to toggle between login/register screens

## Flow

```
App Start
    ↓
AuthContext.isLoading = true
    ↓
Check stored tokens
    ↓
isLoading = false
    ↓
isAuthenticated?
    ├─ No → Show Login/Register screens
    └─ Yes → Show Main App (Tabs)
```

## Auth State Management

The `useAuth()` hook provides:
- `isAuthenticated`: boolean - whether user is logged in
- `isLoading`: boolean - whether auth state is being initialized
- `login(email, password)`: Login method
- `register(email, password, name)`: Registration method
- `logout()`: Logout method

## Screen Navigation

### Auth Screens
- No navigation stack used (compatible with RN 0.79)
- Simple state toggle: `authScreen === 'login' ? <LoginScreen /> : <RegisterScreen />`
- Props used for switching: `onSwitchToRegister` / `onSwitchToLogin`

### Main App
- Authenticated users see the tab navigation
- Four tabs: 레시피, 식사계획, 장보기, 프로필

## API Integration

- Login: `POST /api/v1/auth/login { email, password }`
- Register: `POST /api/v1/auth/register { email, password, name }`
- Tokens stored in AsyncStorage via `storage` util
- Access token set in API client headers automatically

## Testing

To test the auth gate:
1. Start the app - should show login screen
2. Try logging in with valid credentials
3. Should navigate to main app tabs
4. Close and restart app - should stay logged in (token persistence)
5. Logout from profile - should return to login screen

## Known Issues

- Old `AuthNavigator.tsx` still exists but is not used (can be deleted)
- The navigator was replaced with simpler auth gate approach
