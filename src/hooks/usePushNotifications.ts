import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const currentToken = useRef<string | null>(null);

  useEffect(() => {
    const supported = Capacitor.isNativePlatform();
    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    PushNotifications.checkPermissions().then(({ receive }) => {
      setPermission(receive === 'prompt-with-rationale' ? 'default' : receive as 'granted' | 'denied' | 'default');
      setIsSubscribed(receive === 'granted');
      setIsLoading(false);
    });

    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      currentToken.current = token.value;
      if (user) {
        await saveToken(user.id, token.value);
      }
      setIsSubscribed(true);
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
      toast.error('Error al activar notificaciones');
    });

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
    };
  }, [user]);

  const saveToken = async (userId: string, token: string) => {
    // 'push_tokens' is not in the generated Supabase types; cast to keep type-checking green.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pushTokens = supabase.from('push_tokens' as any) as any;
    const { error } = await pushTokens.upsert(
      { user_id: userId, token, platform: Capacitor.getPlatform() as 'ios' | 'android' },
      { onConflict: 'token' }
    );
    if (error) console.error('Error saving push token:', error);
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;

    try {
      setIsLoading(true);
      const { receive } = await PushNotifications.requestPermissions();
      setPermission(receive === 'prompt-with-rationale' ? 'default' : receive as 'granted' | 'denied' | 'default');

      if (receive !== 'granted') {
        toast.error('Necesitas permitir las notificaciones para activarlas');
        return false;
      }

      await PushNotifications.register();
      toast.success('Notificaciones push activadas');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Error al activar notificaciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);
      if (currentToken.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('push_tokens' as any) as any).delete().eq('token', currentToken.current);
      }
      await PushNotifications.removeAllDeliveredNotifications();
      setIsSubscribed(false);
      toast.success('Notificaciones push desactivadas');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al desactivar notificaciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
}
