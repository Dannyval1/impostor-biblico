// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Redirect react-native-google-mobile-ads to a web-safe stub on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === 'react-native-google-mobile-ads'
  ) {
    return {
      filePath: require.resolve('./react-native-google-mobile-ads.web.js'),
      type: 'sourceFile',
    };
  }
  // Fall back to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
