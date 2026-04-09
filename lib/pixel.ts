export const META_PIXEL_ID = '969990458816538';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq: (...args: any[]) => void;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pixelEvent(event: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
  }
}
