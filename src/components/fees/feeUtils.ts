import i18n from '@/i18n';
import { tr } from '@/lib/tr';
import type { Frequency } from '@/hooks/useClubFees';

export const CURRENCIES = ['EUR', 'GBP', 'CHF', 'USD', 'SEK', 'DKK', 'NOK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'MXN', 'ARS', 'BRL'];

export const PAYMENT_METHODS = ['Stripe', 'Transferencia', 'Efectivo', 'Bizum', 'Domiciliación', 'Otro'];

export function money(amount: number, currency = 'EUR') {
  const lang = (i18n.resolvedLanguage || 'es').slice(0, 2);
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export const frequencyLabel = (f: Frequency, installments = 1) => ({
  once: tr('Pago único'),
  monthly: tr('Mensual ({n} plazos)', { n: installments }),
  quarterly: tr('Trimestral ({n} plazos)', { n: installments }),
  yearly: tr('Anual ({n} plazos)', { n: installments }),
}[f]);

export const enrollmentLink = (slug: string) => `https://www.topvolleymanager.com/inscripcion/${slug}`;
