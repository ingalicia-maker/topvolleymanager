import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  Star, 
  Bus, 
  BarChart3, 
  Shield, 
  Smartphone,
  Check,
  ChevronRight,
  Volleyball
} from 'lucide-react';

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    { icon: Users, titleKey: 'landing.features.players.title', descKey: 'landing.features.players.desc' },
    { icon: Calendar, titleKey: 'landing.features.events.title', descKey: 'landing.features.events.desc' },
    { icon: ClipboardList, titleKey: 'landing.features.absences.title', descKey: 'landing.features.absences.desc' },
    { icon: Star, titleKey: 'landing.features.ratings.title', descKey: 'landing.features.ratings.desc' },
    { icon: Bus, titleKey: 'landing.features.transport.title', descKey: 'landing.features.transport.desc' },
    { icon: BarChart3, titleKey: 'landing.features.stats.title', descKey: 'landing.features.stats.desc' },
  ];

  const freeFeatures = [
    'landing.pricing.free.feature1',
    'landing.pricing.free.feature2',
    'landing.pricing.free.feature3',
    'landing.pricing.free.feature4',
  ];

  const premiumFeatures = [
    'landing.pricing.premium.feature1',
    'landing.pricing.premium.feature2',
    'landing.pricing.premium.feature3',
    'landing.pricing.premium.feature4',
    'landing.pricing.premium.feature5',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volleyball className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Top Volley Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Link to="/auth">
              <Button variant="outline" size="sm">
                {t('auth.login')}
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                {t('landing.getStarted')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Smartphone className="h-4 w-4" />
            {t('landing.hero.badge')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                {t('landing.hero.cta')}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8">
              {t('landing.hero.demo')}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('landing.hero.noCard')}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Credits System Info */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 md:p-12">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold mb-4">
                {t('landing.credits.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {t('landing.credits.description')}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <span className="text-3xl font-bold text-primary">5</span>
                  <p className="text-sm text-muted-foreground">{t('landing.credits.daily')}</p>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <span className="text-3xl font-bold text-primary">00:00</span>
                  <p className="text-sm text-muted-foreground">{t('landing.credits.reset')}</p>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <Shield className="h-8 w-8 text-primary mb-1" />
                  <p className="text-sm text-muted-foreground">{t('landing.credits.secure')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            {t('landing.pricing.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">{t('subscription.free')}</h3>
                <p className="text-muted-foreground mb-6">{t('landing.pricing.free.desc')}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">0€</span>
                  <span className="text-muted-foreground">/{t('landing.pricing.month')}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">
                    {t('landing.getStarted')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative overflow-hidden border-primary shadow-lg">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                {t('landing.pricing.popular')}
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">{t('subscription.premium')}</h3>
                <p className="text-muted-foreground mb-6">{t('landing.pricing.premium.desc')}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">5€</span>
                  <span className="text-muted-foreground">/{t('landing.pricing.month')}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {premiumFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full">
                    {t('landing.pricing.subscribe')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              {t('landing.cta.button')}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Volleyball className="h-6 w-6 text-primary" />
              <span className="font-bold">Top Volley Manager</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Top Volley Manager. {t('landing.footer.rights')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm">
                {t('landing.footer.privacy')}
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm">
                {t('landing.footer.terms')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
