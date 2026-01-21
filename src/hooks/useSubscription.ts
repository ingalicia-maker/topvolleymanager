import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'free' | 'starter' | 'pro' | 'elite' | 'vip';

export interface SubscriptionLimits {
  maxTeams: number;
  maxCoaches: number;
  canExport: boolean;
  canViewCharts: boolean;
  canUseBusStops: boolean;
}

export interface Subscription {
  status: SubscriptionStatus;
  creditsRemaining: number;
  isAdmin: boolean;
  isVip: boolean;
  inGracePeriod: boolean;
  gracePeriodDaysRemaining: number;
}

// Plan limits configuration
const PLAN_LIMITS: Record<SubscriptionStatus, SubscriptionLimits> = {
  free: {
    maxTeams: 2,
    maxCoaches: 0, // Director only
    canExport: false,
    canViewCharts: false,
    canUseBusStops: false,
  },
  starter: {
    maxTeams: 4,
    maxCoaches: 2,
    canExport: true,
    canViewCharts: true,
    canUseBusStops: true,
  },
  pro: {
    maxTeams: 20,
    maxCoaches: 15,
    canExport: true,
    canViewCharts: true,
    canUseBusStops: true,
  },
  elite: {
    maxTeams: Infinity,
    maxCoaches: Infinity,
    canExport: true,
    canViewCharts: true,
    canUseBusStops: true,
  },
  vip: {
    maxTeams: Infinity,
    maxCoaches: Infinity,
    canExport: true,
    canViewCharts: true,
    canUseBusStops: true,
  },
};

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
        const email = (user.email || '').toLowerCase();

        // Check if user is admin
        const { data: isAdminData, error: isAdminError } = await supabase
          .rpc('is_app_admin', { _email: email });

        // Fallback: rely on RLS-protected table read (returns a row only for admins)
        // This makes the admin detection more resilient if the RPC fails for any reason.
        let isAdmin = Boolean(isAdminData);
        if (!isAdmin && isAdminError) {
          console.warn('[useSubscription] is_app_admin RPC failed:', isAdminError);
        }
        if (!isAdmin) {
          const { data: adminRow, error: adminSelectError } = await supabase
            .from('app_admins')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (adminSelectError) {
            console.warn('[useSubscription] app_admins fallback select failed:', adminSelectError);
          } else if (adminRow) {
            isAdmin = true;
          }
        }

        // Check if user is VIP
        const { data: isVipData, error: isVipError } = await supabase
          .rpc('is_vip_user', { _email: email });

        if (isVipError) {
          console.warn('[useSubscription] is_vip_user RPC failed:', isVipError);
        }

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

        // Map old 'premium' status to 'starter' for backwards compatibility
        let status: SubscriptionStatus = 'free';
        if (subData?.status) {
          if (subData.status === 'premium') {
            status = 'starter';
          } else if (['starter', 'pro', 'elite', 'vip'].includes(subData.status)) {
            status = subData.status as SubscriptionStatus;
          }
        }
        
        const isVip = isVipData || false;
        
        // VIPs and admins have unlimited credits (show 999)
        const isPaidPlan = status !== 'free';
        const credits = (isAdmin || isVip || isPaidPlan) 
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
    
    // Paid plans don't consume credits
    if (subscription.isAdmin || subscription.isVip || subscription.status !== 'free') {
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

  const limits = PLAN_LIMITS[subscription.status] || PLAN_LIMITS.free;
  const isPaidPlan = subscription.status !== 'free';

  return {
    subscription,
    loading,
    consumeCredit,
    isPremium: isPaidPlan, // Backwards compatibility
    isPaidPlan,
    canExport: limits.canExport,
    canViewCharts: limits.canViewCharts,
    canUseBusStops: limits.canUseBusStops,
    maxTeams: limits.maxTeams,
    maxCoaches: limits.maxCoaches,
    limits,
  };
}
