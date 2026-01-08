import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { Coins, Clock, Infinity } from 'lucide-react';
import { useEffect, useState } from 'react';

export function CreditsDisplay() {
  const { t } = useTranslation();
  const { subscription, isPremium } = useSubscription();
  const [timeUntilReset, setTimeUntilReset] = useState('');

  useEffect(() => {
    const calculateTimeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    setTimeUntilReset(calculateTimeUntilMidnight());
    
    const interval = setInterval(() => {
      setTimeUntilReset(calculateTimeUntilMidnight());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
        <Infinity className="h-4 w-4" />
        <span className="text-sm font-medium">{t('subscription.unlimitedCredits')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-muted">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {subscription.creditsRemaining}/5 {t('landing.credits.available')}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{t('landing.credits.resetIn')} {timeUntilReset}</span>
      </div>
    </div>
  );
}
