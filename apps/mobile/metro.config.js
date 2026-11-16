// Expo (SDK 52+) auto-configures Metro for pnpm monorepos, so we only need
// to layer NativeWind on top of the default config.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
