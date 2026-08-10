import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const getSessionId = () => {
  const storageKey = 'tvm_analytics_session';
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  sessionStorage.setItem(storageKey, sessionId);
  return sessionId;
};

export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const locale = location.pathname.match(/^\/(es|en|it)(?:\/|$)/)?.[1] ?? 'es';
    const referrer = document.referrer && new URL(document.referrer).origin !== window.location.origin
      ? document.referrer
      : null;

    void supabase.from('page_views').insert({
      path: location.pathname,
      locale,
      referrer,
      session_id: getSessionId(),
    }).then(({ error }) => {
      if (error) console.warn('[Analytics] Page view was not recorded:', error.message);
    });
  }, [location.pathname]);

  return null;
}