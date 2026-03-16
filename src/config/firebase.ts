import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

import Constants from 'expo-constants';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyCChjZF8OfGGaP89FjW4E6_DG9rffL_7fM",
    authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "impostor-biblico-d83f1.firebaseapp.com",
    projectId: Constants.expoConfig?.extra?.firebaseProjectId || "impostor-biblico-d83f1",
    storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "impostor-biblico-d83f1.firebasestorage.app",
    messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "51405153410",
    appId: Constants.expoConfig?.extra?.firebaseAppId || "1:51405153410:web:07d59070061dd4e00ac09b",
    measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || "G-Y4CKRMWTGC",
    databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl || "https://impostor-biblico-d83f1-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (conditionally, as it might validly fail in some environments)
let analytics;
isSupported().then(supported => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

// Initialize Realtime Database
const database = getDatabase(app, "https://impostor-biblico-d83f1-default-rtdb.firebaseio.com/");

export { app, database, analytics };
