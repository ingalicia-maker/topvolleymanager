import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import { useAuth } from './useAuth';

const API_KEYS: Record<string, string | undefined> = {
  ios: import.meta.env.VITE_REVENUECAT_API_KEY_IOS,
  android: import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID,
};

export function usePurchases() {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(isNative);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!isNative || !user) {
      setLoading(false);
      return;
    }

    const apiKey = API_KEYS[Capacitor.getPlatform()];
    if (!apiKey) {
      console.warn('[usePurchases] RevenueCat API key not configured for this platform');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await Purchases.configure({ apiKey, appUserID: user.id });
        setIsConfigured(true);

        const [{ customerInfo: info }, offeringsResult] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;
        setCustomerInfo(info);
        setOfferings(offeringsResult);
      } catch (error) {
        console.error('[usePurchases] Error initializing RevenueCat:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative, user]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    setCustomerInfo(result.customerInfo);
    return result.customerInfo;
  }, []);

  const restorePurchases = useCallback(async () => {
    const result = await Purchases.restorePurchases();
    setCustomerInfo(result.customerInfo);
    return result.customerInfo;
  }, []);

  const activeEntitlements = customerInfo ? Object.keys(customerInfo.entitlements.active) : [];

  return {
    isNative,
    isConfigured,
    loading,
    customerInfo,
    offerings,
    activeEntitlements,
    purchasePackage,
    restorePurchases,
  };
}
