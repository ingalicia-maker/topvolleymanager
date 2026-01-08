import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <Select value={i18n.language} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentLang.flag}</span>
              <span>{currentLang.name}</span>
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
