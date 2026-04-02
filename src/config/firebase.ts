import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { Platform } from "react-native";
import Constants from 'expo-constants';

import runtime from './firebase.runtime.json';

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;

type RuntimeKey = keyof typeof runtime;

function pickRequired(key: RuntimeKey): string {
    const fromFile = typeof runtime[key] === 'string' ? (runtime[key] as string).trim() : '';
    const envMap: Record<RuntimeKey, string | undefined> = {
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    };
    const fromEnv = (envMap[key] || '').trim();
    const fromExtra = (extra?.[key] || '').trim();
    const v = fromFile || fromEnv || fromExtra;
    if (!v) {
        throw new Error(
            `[Firebase] Falta ${String(key)}. Ejecuta \`npm start\` (no solo \`expo start\`) para generar ` +
            '`src/config/firebase.runtime.json` desde tu `.env`, o revisa .env.example.'
        );
    }
    return v;
}

function pickOptional(key: RuntimeKey): string | undefined {
    const fromFile = typeof runtime[key] === 'string' ? (runtime[key] as string).trim() : '';
    const envMap: Record<RuntimeKey, string | undefined> = {
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    };
    const fromEnv = (envMap[key] || '').trim();
    const fromExtra = (extra?.[key] || '').trim();
    const v = fromFile || fromEnv || fromExtra;
    return v || undefined;
}

const firebaseConfig = {
    apiKey: pickRequired('firebaseApiKey'),
    authDomain: pickRequired('firebaseAuthDomain'),
    projectId: pickRequired('firebaseProjectId'),
    storageBucket: pickRequired('firebaseStorageBucket'),
    messagingSenderId: pickRequired('firebaseMessagingSenderId'),
    appId: pickRequired('firebaseAppId'),
    measurementId: pickOptional('firebaseMeasurementId'),
    databaseURL: pickRequired('firebaseDatabaseUrl'),
};

const app = initializeApp(firebaseConfig);

let analytics: any;
isSupported().then(supported => {
    if (supported) analytics = getAnalytics(app);
});

const database = getDatabase(app, firebaseConfig.databaseURL);

let auth: ReturnType<typeof getAuth>;
try {
    if (Platform.OS !== 'web') {
        const authModule = require('@firebase/auth');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (authModule.initializeAuth && authModule.getReactNativePersistence) {
            auth = authModule.initializeAuth(app, {
                persistence: authModule.getReactNativePersistence(AsyncStorage),
            });
        } else {
            auth = getAuth(app);
        }
    } else {
        auth = getAuth(app);
    }
} catch {
    auth = getAuth(app);
}

async function ensureAnonymousAuth(): Promise<string> {
    if (auth.currentUser) return auth.currentUser.uid;

    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                unsubscribe();
                resolve(user.uid);
            }
        });

        signInAnonymously(auth).catch((err) => {
            unsubscribe();
            reject(err);
        });
    });
}

export { app, database, analytics, auth, ensureAnonymousAuth };
