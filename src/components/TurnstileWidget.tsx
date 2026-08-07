import { useEffect, useRef, useCallback } from 'react';

// Cloudflare Turnstile Site Key (public)
const TURNSTILE_SITE_KEY = '0x4AAAAAACOIe69AmEkp2UGF';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  appearance?: 'always' | 'execute' | 'interaction-only';
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  invisible?: boolean;
}

export function TurnstileWidget({ 
  onVerify, 
  onError, 
  onExpire,
  invisible = true 
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onVerify,
        'error-callback': onError,
        'expired-callback': onExpire,
        theme: 'auto',
        size: invisible ? 'invisible' : 'normal',
        appearance: invisible ? 'interaction-only' : 'always',
      });
    } catch (error) {
      console.error('Error rendering Turnstile widget:', error);
    }
  }, [onVerify, onError, onExpire, invisible]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const renderWhenReady = () => {
      if (cancelled) return;
      if (window.turnstile) {
        renderWidget();
        return;
      }
      retryTimer = window.setTimeout(renderWhenReady, 150);
    };

    // Load once. Polling also handles React remounts while the shared script is
    // still downloading, which previously left registration without a token.
    if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWhenReady, { once: true });
      script.addEventListener('error', () => onError?.(), { once: true });
      document.head.appendChild(script);
    }
    renderWhenReady();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget might already be removed
        }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget, onError]);

  return (
    <div 
      ref={containerRef} 
      className={invisible ? 'sr-only' : 'flex justify-center my-4'}
      aria-hidden={invisible}
    />
  );
}

// Hook to use Turnstile verification
export function useTurnstile() {
  const tokenRef = useRef<string | null>(null);
  const isVerifiedRef = useRef(false);

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
    isVerifiedRef.current = true;
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
    isVerifiedRef.current = false;
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);
  
  const isVerified = useCallback(() => isVerifiedRef.current, []);

  return {
    setToken,
    clearToken,
    getToken,
    isVerified,
  };
}
