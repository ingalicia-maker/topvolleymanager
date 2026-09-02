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
