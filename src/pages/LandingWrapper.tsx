import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import i18n from '@/i18n';
import Landing from './Landing';
import NotFound from './NotFound';

const SUPPORTED_LANGUAGES = ['es', 'en', 'it'];

export default function LandingWrapper() {
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // Any other single-segment path (a mistyped link) is a missing page, not a language
  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    return <NotFound />;
  }

  return <Landing />;
}
