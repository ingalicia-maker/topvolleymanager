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
