import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import i18n from '@/i18n';
import Landing from './Landing';

const SUPPORTED_LANGUAGES = ['es', 'en', 'it'];

export default function LandingWrapper() {
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // If invalid language, redirect to Spanish
  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    return <Navigate to="/es" replace />;
  }

  return <Landing />;
}
