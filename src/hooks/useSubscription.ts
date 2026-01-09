import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'free' | 'premium' | 'vip';

export interface Subscription {
  status: SubscriptionStatus;
  creditsRemaining: number;
  isAdmin: boolean;
  isVip: boolean;
  inGracePeriod: boolean;
  gracePeriodDaysRemaining: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>({
    status: 'free',
    creditsRemaining: 5,
    isAdmin: false,
    isVip: false,
    inGracePeriod: false,
    gracePeriodDaysRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const { data: isAdminData } = await supabase
          .rpc('is_app_admin', { _email: user.email || '' });

        // Check if user is VIP
        const { data: isVipData } = await supabase
          .rpc('is_vip_user', { _email: user.email || '' });

        // Get subscription status
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        // Get today's credits
        const { data: creditsData } = await supabase
          .rpc('get_user_credits', { _user_id: user.id });

        // Check grace period
        const { data: inGracePeriod } = await supabase
          .rpc('is_in_grace_period', { _user_id: user.id });

        const { data: graceDaysRemaining } = await supabase
          .rpc('get_grace_period_days_remaining', { _user_id: user.id });

        const status = subData?.status as SubscriptionStatus || 'free';
        const isAdmin = isAdminData || false;
        const isVip = isVipData || false;
        
        // VIPs and admins have unlimited credits (show 999)
        const credits = (isAdmin || isVip || status === 'premium' || status === 'vip') 
          ? 999 
          : (creditsData || 5);

        setSubscription({
          status: isAdmin || isVip ? 'vip' : status,
          creditsRemaining: credits,
          isAdmin,
          isVip,
          inGracePeriod: inGracePeriod || false,
          gracePeriodDaysRemaining: graceDaysRemaining || 0,
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const consumeCredit = async (): Promise<boolean> => {
    if (!user) return false;
    
    // VIPs, admins, and premium users don't consume credits
    if (subscription.isAdmin || subscription.isVip || subscription.status === 'premium') {
      return true;
    }

    try {
      const { data } = await supabase
        .rpc('consume_credit', { _user_id: user.id });
      
      if (data) {
        setSubscription(prev => ({
          ...prev,
          creditsRemaining: Math.max(0, prev.creditsRemaining - 1),
        }));
      }
      
      return data || false;
    } catch (error) {
      console.error('Error consuming credit:', error);
      return false;
    }
  };

  const isPremium = subscription.status === 'premium' || subscription.status === 'vip' || subscription.isAdmin || subscription.isVip;
  
  const canExport = isPremium;
  const canViewCharts = isPremium;
  const canUseBusStops = isPremium;
  const maxTeams = isPremium ? Infinity : 1;

  return {
    subscription,
    loading,
    consumeCredit,
    isPremium,
    canExport,
    canViewCharts,
    canUseBusStops,
    maxTeams,
  };
}
