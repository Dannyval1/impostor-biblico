// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure .web.tsx / .web.ts are resolved before .tsx / .ts on web
// Metro already does this by default with the standard platform extensions,
// but we make it explicit here to be safe.
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// For web: alias react-native-google-mobile-ads to our no-op stub
const webStubPath = path.resolve(__dirname, 'react-native-google-mobile-ads.web.js');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
        platform === 'web' &&
        (moduleName === 'react-native-google-mobile-ads' ||
         moduleName.startsWith('react-native-google-mobile-ads/'))
    ) {
        return { filePath: webStubPath, type: 'sourceFile' };
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
