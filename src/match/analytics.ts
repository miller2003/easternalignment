/**
 * src/match/analytics.ts
 * Anonymous, privacy-compliant event tracking for the Reader Match System.
 */

export function trackMatchEvent(eventName: string, properties: Record<string, any> = {}) {
  try {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    // 1. Dispatch custom DOM event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ea_match_event', { detail: payload }));

      // 2. PostHog integration if present
      if ((window as any).posthog && typeof (window as any).posthog.capture === 'function') {
        (window as any).posthog.capture(eventName, properties);
      }

      // 3. GTM / DataLayer if present
      if (Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push(payload);
      }

      // 4. Debug logger
      if (window.location.search.includes('debug=true')) {
        console.log(`[EA Match Analytics]`, eventName, properties);
      }
    }
  } catch (err) {
    // Fail silently to never interrupt user interaction
  }
}
