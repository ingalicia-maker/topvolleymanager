import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Generate VAPID keys for push notifications
// This is a placeholder - in production you'd generate real keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check if already subscribed
        if (user) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await (registration as any).pushManager?.getSubscription();
          setIsSubscribed(!!subscription);
        }
      }
      
      setIsLoading(false);
    };

    checkSupport();
  }, [user]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;

    try {
      setIsLoading(true);
      
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Necesitas permitir las notificaciones para activarlas');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      
      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subscriptionJson = subscription.toJSON();
      
      // Save to database
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth
      });

      if (error) {
        // If duplicate, that's fine
        if (!error.message.includes('duplicate')) {
          throw error;
        }
      }

      setIsSubscribed(true);
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
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager?.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

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
