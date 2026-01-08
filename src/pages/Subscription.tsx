import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import {
  Crown,
  Zap,
  Users,
  FileSpreadsheet,
  LineChart,
  Bus,
  Check,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function Subscription() {
  const { t } = useTranslation();
  const { subscription, loading, isPremium, canExport, canViewCharts, canUseBusStops } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('subscription.title')} showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const statusConfig = {
    free: { label: t('subscription.free'), color: 'secondary', icon: Zap },
    premium: { label: t('subscription.premium'), color: 'default', icon: Crown },
    vip: { label: t('subscription.vip'), color: 'warning', icon: Sparkles },
  };

  const currentStatus = statusConfig[subscription.status] || statusConfig.free;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('subscription.title')} showBack />

      <div className="p-4 space-y-4">
        {/* Current Plan */}
        <Card className={isPremium ? 'border-primary bg-primary/5' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                {t('subscription.title')}
              </CardTitle>
              <Badge variant={currentStatus.color as any}>
                {currentStatus.label}
              </Badge>
            </div>
            {subscription.status === 'vip' && (
              <CardDescription className="text-amber-600">
                {subscription.isAdmin ? 'App Administrator' : 'VIP Access - Unlimited features'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!isPremium && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{t('subscription.creditsRemaining')}</span>
                  <span className="text-2xl font-bold text-primary">{subscription.creditsRemaining}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('subscription.creditsReset')}
                </p>
              </div>
            )}
            {isPremium && (
              <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg">
                <span className="text-primary font-medium">✨ {t('subscription.unlimitedCredits')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('subscription.premiumFeatures')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureRow icon={Users} label={t('subscription.unlimitedTeams')} active={isPremium} />
            <FeatureRow icon={Zap} label={t('subscription.unlimitedCredits')} active={isPremium} />
            <FeatureRow icon={FileSpreadsheet} label={t('subscription.exportData')} active={canExport} />
            <FeatureRow icon={LineChart} label={t('subscription.evolutionCharts')} active={canViewCharts} />
            <FeatureRow icon={Bus} label={t('subscription.busStops')} active={canUseBusStops} />
          </CardContent>
        </Card>

        {/* Upgrade CTA */}
        {!isPremium && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Crown className="h-5 w-5" />
                {t('subscription.upgradeToPremium')}
              </CardTitle>
              <CardDescription>
                {t('subscription.freeLimits')}: {t('subscription.oneTeam')}, {t('subscription.dailyCredits')}, {t('subscription.noExport')}, {t('subscription.noCharts')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gap-2" size="lg">
                <Crown className="h-5 w-5" />
                {t('subscription.subscribe')} - {t('subscription.pricePerMonth', { price: '5€' })}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Cancel anytime
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function FeatureRow({ icon: Icon, label, active }: { icon: any; label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={active ? '' : 'text-muted-foreground'}>{label}</span>
      </div>
      {active ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}
