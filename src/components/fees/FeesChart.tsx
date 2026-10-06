import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import i18n from '@/i18n';
import { isOverdue, type FeeCharge } from '@/hooks/useClubFees';
import { money } from './feeUtils';
import { tr } from '@/lib/tr';

interface Props {
  charges: FeeCharge[];
  currency: string;
}

/** Collected, pending and overdue amounts per month of the due date, plus the collection rate. */
export function FeesChart({ charges, currency }: Props) {
  const lang = (i18n.resolvedLanguage || 'es').slice(0, 2);
  const live = charges.filter(c => c.status !== 'waived');

  const data = useMemo(() => {
    const byMonth = new Map<string, { paid: number; pending: number; overdue: number }>();
    for (const c of live) {
      const key = c.due_date.slice(0, 7);
      const m = byMonth.get(key) ?? { paid: 0, pending: 0, overdue: 0 };
      if (c.status === 'paid') m.paid += c.amount;
      else if (isOverdue(c)) m.overdue += c.amount;
      else m.pending += c.amount;
      byMonth.set(key, m);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({
      month: new Date(`${key}-01T00:00:00`).toLocaleDateString(lang, { month: 'short', year: '2-digit' }),
      ...v,
    }));
  }, [live, lang]);

  const total = live.reduce((s, c) => s + c.amount, 0);
  const paid = live.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const rate = total ? Math.round((paid / total) * 100) : 0;

  if (!data.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{tr('Cobros por mes')}</CardTitle>
        <span className="text-sm text-muted-foreground">{tr('{n}% cobrado', { n: rate })}</span>
      </CardHeader>
      <CardContent className="h-56 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={v => money(Number(v), currency).replace(/[,.]00(?=\D*$)/, '')} />
            <Tooltip formatter={(v: number) => money(v, currency)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="paid" name={tr('Cobrado')} stackId="a" fill="#16a34a" />
            <Bar dataKey="pending" name={tr('Pendiente')} stackId="a" fill="#94a3b8" />
            <Bar dataKey="overdue" name={tr('Vencido')} stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
