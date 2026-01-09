import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  AlertTriangle,
  Gift,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Subscription() {
  const { t } = useTranslation();
  const { subscription, loading, isPremium, canExport, canViewCharts, canUseBusStops } = useSubscription();
  
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [stripeSubscription, setStripeSubscription] = useState<{
    subscribed: boolean;
    interval?: string;
    subscription_end?: string;
  } | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showYearlyOffer, setShowYearlyOffer] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Check Stripe subscription on mount
  useEffect(() => {
    checkStripeSubscription();
  }, []);

  const checkStripeSubscription = async () => {
    setCheckingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setStripeSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingStripe(false);
    }
  };

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setProcessingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCancelClick = () => {
    // First show the yearly offer
    setShowYearlyOffer(true);
  };

  const handleConfirmCancel = async () => {
    setShowYearlyOffer(false);
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Error al abrir el portal de gestión');
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleUpgradeToYearly = async () => {
    setShowYearlyOffer(false);
    await handleCheckout('yearly');
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Error al abrir el portal de gestión');
    } finally {
      setOpeningPortal(false);
    }
  };

  if (loading || checkingStripe) {
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
  const isYearly = stripeSubscription?.interval === 'year';

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
                {isPremium && stripeSubscription?.subscribed && (
                  <span className="ml-1">({isYearly ? 'Anual' : 'Mensual'})</span>
                )}
              </Badge>
            </div>
            {subscription.status === 'vip' && (
              <CardDescription className="text-amber-600">
                {subscription.isAdmin ? 'Administrador de la App' : 'Acceso VIP - Funciones ilimitadas'}
              </CardDescription>
            )}
            {isPremium && stripeSubscription?.subscription_end && (
              <CardDescription>
                Próxima renovación: {format(new Date(stripeSubscription.subscription_end), "d 'de' MMMM yyyy", { locale: es })}
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
          {isPremium && stripeSubscription?.subscribed && subscription.status !== 'vip' && (
            <CardFooter className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={handleManageSubscription}
                disabled={openingPortal}
              >
                <Settings className="h-4 w-4" />
                {openingPortal ? 'Abriendo...' : 'Gestionar'}
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleCancelClick}
              >
                Cancelar suscripción
              </Button>
            </CardFooter>
          )}
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
          <>
            {/* Monthly Plan */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Crown className="h-5 w-5" />
                  Plan Mensual
                </CardTitle>
                <CardDescription>
                  {t('subscription.freeLimits')}: {t('subscription.oneTeam')}, {t('subscription.dailyCredits')}, {t('subscription.noExport')}, {t('subscription.noCharts')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={() => handleCheckout('monthly')}
                  disabled={processingCheckout}
                >
                  {processingCheckout ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Crown className="h-5 w-5" />
                  )}
                  {t('subscription.subscribe')} - 5€/mes
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Cancela cuando quieras
                </p>
              </CardContent>
            </Card>

            {/* Yearly Plan - Best Value */}
            <Card className="border-green-500 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Gift className="h-5 w-5" />
                    Plan Anual
                  </CardTitle>
                  <Badge className="bg-green-500">¡Ahorra 20€!</Badge>
                </div>
                <CardDescription>
                  Paga 40€ al año en lugar de 60€ (5€ x 12 meses)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full gap-2 bg-green-600 hover:bg-green-700" 
                  size="lg"
                  onClick={() => handleCheckout('yearly')}
                  disabled={processingCheckout}
                >
                  {processingCheckout ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Gift className="h-5 w-5" />
                  )}
                  Suscribirse - 40€/año
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Equivale a 3,33€/mes • Cancela cuando quieras
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Yearly Offer Dialog (shown before cancel) */}
      <Dialog open={showYearlyOffer} onOpenChange={setShowYearlyOffer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              ¡Espera! Tenemos una oferta para ti
            </DialogTitle>
            <DialogDescription>
              Antes de cancelar, considera cambiar al plan anual y ahorra 20€
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <Card className="border-green-500 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-600">Plan Anual</span>
                  <Badge className="bg-green-500">Recomendado</Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-600">40€</span>
                  <span className="text-muted-foreground line-through">60€</span>
                  <span className="text-sm text-muted-foreground">/año</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Ahorra 20€ pagando anualmente
                </p>
              </CardContent>
            </Card>

            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Aviso importante</p>
                  <p className="text-sm text-muted-foreground">
                    Si cancelas, perderás acceso a todas las funciones Premium al finalizar 
                    tu período de pago actual. Tus datos de valoraciones y configuración 
                    podrían no estar disponibles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full gap-2 bg-green-600 hover:bg-green-700" 
              onClick={handleUpgradeToYearly}
              disabled={processingCheckout}
            >
              {processingCheckout ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Cambiar a Plan Anual (40€/año)
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleConfirmCancel}
              disabled={openingPortal}
            >
              {openingPortal ? 'Abriendo portal...' : 'Continuar con la cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
