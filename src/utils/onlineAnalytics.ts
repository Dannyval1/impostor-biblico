import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

/** Eventos GA4 modo online; no-op si Analytics no está disponible (p. ej. RN sin soporte). */
export function logOnlineAnalytics(
    eventName: string,
    params?: Record<string, string | number | boolean>
): void {
    try {
        if (analytics) logEvent(analytics, eventName, params);
    } catch {
        /* noop */
    }
}
