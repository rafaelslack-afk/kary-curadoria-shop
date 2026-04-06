export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' &&
      typeof (window as any).gtag === 'function') { // eslint-disable-line @typescript-eslint/no-explicit-any
    ;(window as any).gtag('event', eventName, params) // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
