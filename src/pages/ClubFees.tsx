import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRole } from '@/hooks/useUserRole';
import { isOverdue, useClubFees } from '@/hooks/useClubFees';
import { EnrollmentsPanel } from '@/components/fees/EnrollmentsPanel';
import { PaymentsPanel } from '@/components/fees/PaymentsPanel';
import { PlansPanel } from '@/components/fees/PlansPanel';
import { FormsPanel } from '@/components/fees/FormsPanel';
import { FeeSettingsPanel } from '@/components/fees/FeeSettingsPanel';
import { money } from '@/components/fees/feeUtils';
import { FeesChart } from '@/components/fees/FeesChart';
import { tr } from '@/lib/tr';

/** Club fees: enrolments, payments, fee plans, enrolment forms and reminders. Directors only. */
export default function ClubFees() {
  const { isDirector, loading: roleLoading } = useUserRole();
  const fees = useClubFees();
  const currency = fees.settings?.currency ?? 'EUR';

  const summary = useMemo(() => {
    const live = fees.charges.filter(c => fees.enrollments.find(e => e.id === c.enrollment_id)?.status !== 'cancelled');
    const sum = (list: typeof live) => list.reduce((s, c) => s + c.amount, 0);
    return {
      active: fees.enrollments.filter(e => e.status === 'active').length,
      toReview: fees.enrollments.filter(e => e.status === 'pending').length,
      paid: sum(live.filter(c => c.status === 'paid')),
      pending: sum(live.filter(c => c.status === 'pending' && !isOverdue(c))),
      overdue: sum(live.filter(isOverdue)),
    };
  }, [fees.charges, fees.enrollments]);

  // Roles load after the session is restored: wait for the club data too before deciding
  if (roleLoading || (fees.loading && !fees.settings && !fees.error)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isDirector) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-28">
      <Header title={tr('Cuotas e inscripciones')} showBack backTo="/profile" />
      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {fees.loading && !fees.settings ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : fees.error ? (
          <Card><CardContent className="p-4 text-sm text-destructive">
            {tr('No se pudieron cargar las cuotas. Si es la primera vez, hay que activar esta función en la base de datos.')} ({fees.error})
          </CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{tr('Inscritos')}</p>
                <p className="text-xl font-semibold">{summary.active}</p>
                {summary.toReview > 0 && <p className="text-xs text-amber-600">{tr('{n} por revisar', { n: summary.toReview })}</p>}
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{tr('Cobrado')}</p>
                <p className="text-xl font-semibold text-green-600">{money(summary.paid, currency)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{tr('Pendiente')}</p>
                <p className="text-xl font-semibold">{money(summary.pending, currency)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{tr('Vencido')}</p>
                <p className="text-xl font-semibold text-destructive">{money(summary.overdue, currency)}</p>
              </CardContent></Card>
            </div>

            <FeesChart charges={fees.charges.filter(c => fees.enrollments.find(e => e.id === c.enrollment_id)?.status !== 'cancelled')} currency={currency} />

            <Tabs defaultValue={summary.toReview ? 'enrollments' : 'payments'}>
              <TabsList className="w-full overflow-x-auto justify-start">
                <TabsTrigger value="enrollments">{tr('Inscripciones')}</TabsTrigger>
                <TabsTrigger value="payments">{tr('Pagos')}</TabsTrigger>
                <TabsTrigger value="plans">{tr('Cuotas')}</TabsTrigger>
                <TabsTrigger value="forms">{tr('Formularios')}</TabsTrigger>
                <TabsTrigger value="settings">{tr('Ajustes')}</TabsTrigger>
              </TabsList>
              <TabsContent value="enrollments">
                <EnrollmentsPanel
                  clubId={fees.clubId!} enrollments={fees.enrollments} forms={fees.forms} plans={fees.plans}
                  charges={fees.charges} currency={currency}
                  onSave={fees.saveEnrollment} onActivate={fees.activateEnrollment} onDelete={fees.deleteEnrollment} onImport={fees.importEnrollments}
                />
              </TabsContent>
              <TabsContent value="payments">
                <PaymentsPanel
                  charges={fees.charges} enrollments={fees.enrollments} currency={currency}
                  onSave={fees.saveCharge} onDelete={fees.deleteCharge} onMarkPaid={fees.markPaid} onRemind={fees.sendReminders}
                />
              </TabsContent>
              <TabsContent value="plans">
                <PlansPanel plans={fees.plans} currency={currency} onSave={fees.savePlan} onDelete={fees.deletePlan} />
              </TabsContent>
              <TabsContent value="forms">
                <FormsPanel forms={fees.forms} plans={fees.plans} clubName={fees.clubName} onSave={fees.saveForm} onDelete={fees.deleteForm} enrollments={fees.enrollments} onSend={fees.sendForm} />
              </TabsContent>
              <TabsContent value="settings">
                {fees.settings && <FeeSettingsPanel settings={fees.settings} onSave={fees.saveSettings} />}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
