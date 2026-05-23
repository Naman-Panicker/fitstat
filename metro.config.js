const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable unstable package exports to resolve victory-native internal typescript resolutions
// by forcing Metro to bundle the compiled production builds instead of raw TS sources.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
