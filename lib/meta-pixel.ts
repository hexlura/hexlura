declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const pageview = (): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

export const event = (name: string, options: Record<string, unknown> = {}): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, options);
  }
};