import { es, enUS, it } from 'date-fns/locale';

export function getDateFnsLocale(language: string) {
  switch (language) {
    case 'es':
      return es;
    case 'it':
      return it;
    default:
      return enUS;
  }
}

// Numeric day/month/year field order: US style (MM/DD) for English, DD/MM otherwise.
export function getBirthDateFieldOrder(language: string): Array<'day' | 'month' | 'year'> {
  return language === 'en' ? ['month', 'day', 'year'] : ['day', 'month', 'year'];
}

export function formatBirthDate(
  day: number | null | undefined,
  month: number | null | undefined,
  year: number | null | undefined,
  language: string,
): string | null {
  if (!year) return null;
  const yyyy = year.toString();
  if (!day || !month) return yyyy;
  const dd = day.toString().padStart(2, '0');
  const mm = month.toString().padStart(2, '0');
  return language === 'en' ? `${mm}/${dd}/${yyyy}` : `${dd}/${mm}/${yyyy}`;
}

// Days until next birthday (0 = today), or null when day/month unknown.
export function daysUntilBirthday(day: number | null | undefined, month: number | null | undefined): number | null {
  if (!day || !month) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function birthdayLabel(days: number, language: string): string {
  const L: Record<string, [string, string, (n: number) => string]> = {
    es: ['¡Hoy es su cumpleaños!', 'Mañana', n => `En ${n} días`],
    it: ['Oggi è il suo compleanno!', 'Domani', n => `Tra ${n} giorni`],
    en: ['Birthday today!', 'Tomorrow', n => `In ${n} days`],
  };
  const l = L[language] || L.en;
  return days === 0 ? l[0] : days === 1 ? l[1] : l[2](days);
}
