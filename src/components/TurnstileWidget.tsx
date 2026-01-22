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
  const scriptLoadedRef = useRef(false);

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
    // Load the Turnstile script if not already loaded
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };

      document.head.appendChild(script);
    } else if (window.turnstile) {
      // Script already loaded
      scriptLoadedRef.current = true;
      renderWidget();
    }

    return () => {
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
  }, [renderWidget]);

  // Re-render if script loads after initial mount
  useEffect(() => {
    if (scriptLoadedRef.current && !widgetIdRef.current) {
      renderWidget();
    }
  }, [renderWidget]);

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
