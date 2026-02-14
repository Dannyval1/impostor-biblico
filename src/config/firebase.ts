import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCChjZF8OfGGaP89FjW4E6_DG9rffL_7fM",
    authDomain: "impostor-biblico-d83f1.firebaseapp.com",
    projectId: "impostor-biblico-d83f1",
    storageBucket: "impostor-biblico-d83f1.firebasestorage.app",
    messagingSenderId: "51405153410",
    appId: "1:51405153410:web:07d59070061dd4e00ac09b",
    measurementId: "G-Y4CKRMWTGC",
    databaseURL: "https://impostor-biblico-d83f1-default-rtdb.firebaseio.com/"
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
