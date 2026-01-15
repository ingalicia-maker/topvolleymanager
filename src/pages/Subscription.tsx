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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Clock,
  Star,
  Rocket,
  Building2,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PlanType = 'starter_monthly' | 'starter_yearly' | 'pro_monthly' | 'pro_yearly';

export default function Subscription() {
  const { t } = useTranslation();
  const { subscription, loading, isPaidPlan, canExport, canViewCharts, canUseBusStops, limits } = useSubscription();
  
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [stripeSubscription, setStripeSubscription] = useState<{
    subscribed: boolean;
    interval?: string;
    subscription_end?: string;
    priceId?: string;
  } | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showYearlyOffer, setShowYearlyOffer] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

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

  const handleCheckout = async (plan: PlanType) => {
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

  const handleContactElite = () => {
    window.location.href = 'mailto:contacto@topvolleymanager.com?subject=Consulta%20Plan%20Elite';
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
    starter: { label: t('subscription.starter'), color: 'default', icon: Star },
    pro: { label: t('subscription.pro'), color: 'default', icon: Rocket },
    elite: { label: t('subscription.elite'), color: 'default', icon: Building2 },
    vip: { label: t('subscription.vip'), color: 'warning', icon: Sparkles },
  };

  const currentStatus = statusConfig[subscription.status] || statusConfig.free;
  const StatusIcon = currentStatus.icon;
  const isYearly = stripeSubscription?.interval === 'year';

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('subscription.title')} showBack />

      <div className="p-4 space-y-4">
        {/* Grace Period Banner */}
        {subscription.inGracePeriod && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-500/10">
            <Clock className="h-4 w-4" />
            <AlertTitle className="text-orange-600">Período de gracia activo</AlertTitle>
            <AlertDescription className="text-orange-600/80">
              Tu suscripción ha sido cancelada. Tienes {subscription.gracePeriodDaysRemaining} día{subscription.gracePeriodDaysRemaining !== 1 ? 's' : ''} para 
              reactivar tu suscripción antes de que tus datos sean eliminados.
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full border-orange-500 text-orange-600 hover:bg-orange-500/20"
                onClick={() => handleCheckout('starter_monthly')}
                disabled={processingCheckout}
              >
                {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reactivar suscripción
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan */}
        <Card className={isPaidPlan ? 'border-primary bg-primary/5' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${isPaidPlan ? 'text-primary' : 'text-muted-foreground'}`} />
                {t('subscription.currentPlan')}
              </CardTitle>
              <Badge variant={currentStatus.color as any}>
                {currentStatus.label}
                {isPaidPlan && stripeSubscription?.subscribed && (
                  <span className="ml-1">({isYearly ? 'Anual' : 'Mensual'})</span>
                )}
              </Badge>
            </div>
            {subscription.status === 'vip' && (
              <CardDescription className="text-amber-600">
                {subscription.isAdmin ? 'Administrador de la App' : 'Acceso VIP - Funciones ilimitadas'}
              </CardDescription>
            )}
            {isPaidPlan && stripeSubscription?.subscription_end && (
              <CardDescription>
                Próxima renovación: {format(new Date(stripeSubscription.subscription_end), "d 'de' MMMM yyyy", { locale: es })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!isPaidPlan && (
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
            {isPaidPlan && (
              <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg">
                <span className="text-primary font-medium">✨ {t('subscription.unlimitedCredits')}</span>
              </div>
            )}
          </CardContent>
          {isPaidPlan && stripeSubscription?.subscribed && subscription.status !== 'vip' && (
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

        {/* Plan Limits Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('subscription.planLimits')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LimitRow 
              icon={Users} 
              label={t('subscription.maxTeams')} 
              value={limits.maxTeams === Infinity ? '∞' : limits.maxTeams.toString()} 
            />
            <LimitRow 
              icon={Crown} 
              label={t('subscription.maxCoaches')} 
              value={limits.maxCoaches === Infinity ? '∞' : (limits.maxCoaches === 0 ? t('subscription.directorOnly') : limits.maxCoaches.toString())} 
            />
            <FeatureRow icon={FileSpreadsheet} label={t('subscription.exportData')} active={canExport} />
            <FeatureRow icon={LineChart} label={t('subscription.evolutionCharts')} active={canViewCharts} />
            <FeatureRow icon={Bus} label={t('subscription.busStops')} active={canUseBusStops} />
          </CardContent>
        </Card>

        {/* Plans */}
        {!isPaidPlan && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold px-1">{t('subscription.choosePlan')}</h2>
            
            {/* FREE Plan */}
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    {t('subscription.free')}
                  </CardTitle>
                  <Badge variant="secondary">Actual</Badge>
                </div>
                <CardDescription>{t('subscription.freeDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.freeFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.freeFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('subscription.freeFeature3')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* STARTER Plan */}
            <Card className="border-blue-500 bg-blue-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <Star className="h-5 w-5" />
                    {t('subscription.starter')}
                  </CardTitle>
                </div>
                <CardDescription>{t('subscription.starterDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.starterFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.starterFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.starterFeature3')}
                  </li>
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="w-full border-blue-500 text-blue-600 hover:bg-blue-500/10"
                    onClick={() => handleCheckout('starter_monthly')}
                    disabled={processingCheckout}
                  >
                    {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : '5€/mes'}
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleCheckout('starter_yearly')}
                    disabled={processingCheckout}
                  >
                    {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : '40€/año'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('subscription.yearlySaveStarter')}
                </p>
              </CardContent>
            </Card>

            {/* PRO Plan */}
            <Card className="border-purple-500 bg-purple-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <Rocket className="h-5 w-5" />
                    {t('subscription.pro')}
                  </CardTitle>
                  <Badge className="bg-purple-500">{t('subscription.popular')}</Badge>
                </div>
                <CardDescription>{t('subscription.proDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.proFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.proFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.proFeature3')}
                  </li>
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="w-full border-purple-500 text-purple-600 hover:bg-purple-500/10"
                    onClick={() => handleCheckout('pro_monthly')}
                    disabled={processingCheckout}
                  >
                    {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : '15€/mes'}
                  </Button>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleCheckout('pro_yearly')}
                    disabled={processingCheckout}
                  >
                    {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : '120€/año'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('subscription.yearlySavePro')}
                </p>
              </CardContent>
            </Card>

            {/* ELITE Plan */}
            <Card className="border-amber-500 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <Building2 className="h-5 w-5" />
                    {t('subscription.elite')}
                  </CardTitle>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">{t('subscription.custom')}</Badge>
                </div>
                <CardDescription>{t('subscription.eliteDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.eliteFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.eliteFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('subscription.eliteFeature3')}
                  </li>
                </ul>
                <Button 
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={handleContactElite}
                >
                  <Mail className="h-4 w-4" />
                  {t('subscription.contactUs')}
                </Button>
              </CardContent>
            </Card>
          </div>
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
              Antes de cancelar, considera cambiar al plan anual y ahorra
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Aviso importante</p>
                  <p className="text-sm text-muted-foreground">
                    Si cancelas, perderás acceso a todas las funciones de tu plan al finalizar 
                    tu período de pago actual. Tus datos podrían no estar disponibles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
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

function LimitRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </div>
      <Badge variant="outline" className="font-bold">{value}</Badge>
    </div>
  );
}