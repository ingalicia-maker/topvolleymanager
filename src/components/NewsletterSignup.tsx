import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NewsletterSignup() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentLang = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('it') ? 'it' : 'es';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !privacyAccepted) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers' as any)
        .insert({
          email: email.trim().toLowerCase(),
          language: currentLang,
          source: 'landing',
          privacy_accepted_at: new Date().toISOString(),
        } as any);

      if (error) {
        if (error.code === '23505') {
          toast.info(t('newsletter.alreadySubscribed'));
        } else {
          throw error;
        }
      } else {
        setSuccess(true);
        toast.success(t('newsletter.success'));
      }
    } catch (err) {
      toast.error(t('newsletter.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-xl text-center">
          <div className="bg-primary/5 rounded-2xl p-8">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{t('newsletter.thankYou')}</h3>
            <p className="text-muted-foreground">{t('newsletter.confirmMessage')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-xl text-center">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8">
          <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">{t('newsletter.title')}</h3>
          <p className="text-muted-foreground mb-6">{t('newsletter.subtitle')}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('newsletter.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !privacyAccepted}>
                {loading ? '...' : t('newsletter.subscribe')}
              </Button>
            </div>
            
            <div className="flex items-start gap-2 text-left">
              <Checkbox
                id="privacy-newsletter"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
              />
              <label htmlFor="privacy-newsletter" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                {t('newsletter.privacyAccept')}{' '}
                <Link to="/privacy" className="text-primary underline hover:no-underline" target="_blank">
                  {t('newsletter.privacyLink')}
                </Link>
              </label>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
