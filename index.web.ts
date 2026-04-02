// Web entry point — polyfill globalThis.expo.uuidv4 before anything else loads,
// since expo-constants on web expects it as a native global that doesn't exist on web.
if (typeof globalThis.expo === 'undefined') {
    (globalThis as any).expo = {};
}
if (typeof (globalThis as any).expo.uuidv4 === 'undefined') {
    (globalThis as any).expo.uuidv4 = () => {
        // Use crypto.randomUUID if available (all modern browsers), else fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback polyfill
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
