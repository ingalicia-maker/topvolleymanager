import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', name: 'Español', shortCode: 'ES', flag: '🇪🇸' },
  { code: 'en', name: 'English', shortCode: 'EN', flag: '🇬🇧' },
  { code: 'it', name: 'Italiano', shortCode: 'IT', flag: '🇮🇹' },
];

const SUPPORTED_LANG_PATHS = ['es', 'en', 'it'];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    
    // If we're on a language-prefixed route (landing page), navigate to the new language
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 2 && SUPPORTED_LANG_PATHS.includes(pathParts[1])) {
      navigate(`/${value}`, { replace: true });
    }
  };

  const normalizedLang = i18n.language.startsWith('en')
    ? 'en'
    : i18n.language.startsWith('it')
    ? 'it'
    : 'es';
  const currentLang = LANGUAGES.find(l => l.code === normalizedLang) || LANGUAGES[0];

  return (
    <Select value={normalizedLang} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.name}</span>
              <span className="sm:hidden">{currentLang.shortCode}</span>
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
