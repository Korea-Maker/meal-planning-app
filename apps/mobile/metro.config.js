const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Find the project root (monorepo root)
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for monorepo support
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Ensure we resolve from the monorepo packages
    extraNodeModules: {
      '@meal-planning/shared-types': path.resolve(monorepoRoot, 'packages/shared-types'),
      '@meal-planning/constants': path.resolve(monorepoRoot, 'packages/constants'),
      // Explicitly resolve react-native from monorepo root for pnpm
      'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
      'react': path.resolve(monorepoRoot, 'node_modules/react'),
    },
    // Enable symlinks for pnpm compatibility
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
