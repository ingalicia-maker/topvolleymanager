import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

export function CookieBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      // Small delay to avoid layout shift on page load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card border rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">
                  {t('cookies.title', 'Utilizamos cookies')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('cookies.description', 'Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y mostrarte contenido personalizado. Al hacer clic en "Aceptar", consientes el uso de todas las cookies.')}{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    {t('cookies.learnMore', 'Más información')}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={declineCookies}
                className="flex-1 md:flex-none"
              >
                {t('cookies.decline', 'Rechazar')}
              </Button>
              <Button
                size="sm"
                onClick={acceptCookies}
                className="flex-1 md:flex-none"
              >
                {t('cookies.accept', 'Aceptar')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
