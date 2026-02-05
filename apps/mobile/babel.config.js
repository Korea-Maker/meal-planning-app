module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Required for react-native-reanimated (moved to worklets package in v4)
    'react-native-worklets/plugin',
  ],
};
