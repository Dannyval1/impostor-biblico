/**
 * Escribe src/config/firebase.runtime.json desde .env (local) o desde process.env (EAS Build).
 * En React Native / dev client, process.env en el bundle suele ir vacío; este JSON sí lo empaqueta Metro.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });

const examplePath = path.join(root, 'src', 'config', 'firebase.runtime.example.json');
const outPath = path.join(root, 'src', 'config', 'firebase.runtime.json');

const base = JSON.parse(fs.readFileSync(examplePath, 'utf8'));

function firstNonEmpty(...keys) {
    for (const k of keys) {
        const v = process.env[k];
        if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
}

const out = {
    firebaseApiKey: firstNonEmpty('EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
    firebaseAuthDomain: firstNonEmpty('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
    firebaseProjectId: firstNonEmpty('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
    firebaseStorageBucket: firstNonEmpty('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
    firebaseMessagingSenderId: firstNonEmpty('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
    firebaseAppId: firstNonEmpty('EXPO_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID'),
    firebaseMeasurementId: firstNonEmpty('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID'),
    firebaseDatabaseUrl: firstNonEmpty('EXPO_PUBLIC_FIREBASE_DATABASE_URL', 'FIREBASE_DATABASE_URL'),
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 4) + '\n', 'utf8');
console.log('[sync-firebase-env] OK →', path.relative(root, outPath));
