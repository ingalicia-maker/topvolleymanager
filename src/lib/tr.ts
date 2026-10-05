import i18n from '@/i18n';
import en from '@/i18n/tr/en.json';
import it from '@/i18n/tr/it.json';

// Interface text written directly in Spanish in the code (toasts, labels, dialogs) is
// translated here by lookup, keyed by the Spanish text (src/i18n/tr/<lang>.json).
// Missing entries fall back to Spanish. Prefer t('key') for new screens.
const DICTS: Record<string, Record<string, string>> = { en, it };

export type TrVars = Record<string, string | number>;

/** Translate a Spanish UI string into the current language. `{name}` placeholders are filled from `vars`. */
export function tr(text: string, vars?: TrVars): string {
  const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2);
  const out = DICTS[lang]?.[text] ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}
