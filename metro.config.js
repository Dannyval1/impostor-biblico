// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure .web.tsx / .web.ts are resolved before .tsx / .ts on web
// Metro already does this by default with the standard platform extensions,
// but we make it explicit here to be safe.
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

const adsWebStub = path.resolve(__dirname, 'react-native-google-mobile-ads.web.js');
const expoModulesCoreWebShim = path.resolve(__dirname, 'expo-modules-core.web.js');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
        if (
            moduleName === 'react-native-google-mobile-ads' ||
            moduleName.startsWith('react-native-google-mobile-ads/')
        ) {
            return { filePath: adsWebStub, type: 'sourceFile' };
        }

        // expo-constants imports { uuidv4 } from 'expo-modules-core' but the
        // installed version doesn't export it.  Redirect to our shim which
        // re-exports everything and adds the missing function.
        // Skip the redirect when the shim itself imports 'expo-modules-core'
        // so it resolves to the real package (avoids circular resolution).
        if (
            moduleName === 'expo-modules-core' &&
            context.originModulePath !== expoModulesCoreWebShim
        ) {
            return { filePath: expoModulesCoreWebShim, type: 'sourceFile' };
        }
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
