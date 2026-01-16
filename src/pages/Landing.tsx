import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import { CookieBanner } from '@/components/CookieBanner';
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
import demoDashboard from '@/assets/demo-dashboard-real.png';
import demoEvents from '@/assets/demo-events-real.png';
import demoRatings from '@/assets/demo-ratings-real.png';
import demoAusencias from '@/assets/demo-ausencias-real.png';
import demoDesplazamiento from '@/assets/demo-desplazamiento-real.png';
import demoEquipos from '@/assets/demo-equipos-real.png';

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

  const starterFeatures = [
    'landing.pricing.starter.feature1',
    'landing.pricing.starter.feature2',
    'landing.pricing.starter.feature3',
    'landing.pricing.starter.feature4',
    'landing.pricing.starter.feature5',
  ];

  const proFeatures = [
    'landing.pricing.pro.feature1',
    'landing.pricing.pro.feature2',
    'landing.pricing.pro.feature3',
    'landing.pricing.pro.feature4',
  ];

  const eliteFeatures = [
    'landing.pricing.elite.feature1',
    'landing.pricing.elite.feature2',
    'landing.pricing.elite.feature3',
    'landing.pricing.elite.feature4',
  ];

  const demoScreens = [
    {
      image: demoDashboard,
      titleKey: 'landing.demo.dashboardTitle',
      descKey: 'landing.demo.dashboardDesc',
    },
    {
      image: demoEvents,
      titleKey: 'landing.demo.eventsTitle',
      descKey: 'landing.demo.eventsDesc',
    },
    {
      image: demoRatings,
      titleKey: 'landing.demo.ratingsTitle',
      descKey: 'landing.demo.ratingsDesc',
    },
    {
      image: demoAusencias,
      titleKey: 'landing.demo.ausenciasTitle',
      descKey: 'landing.demo.ausenciasDesc',
    },
    {
      image: demoDesplazamiento,
      titleKey: 'landing.demo.transportTitle',
      descKey: 'landing.demo.transportDesc',
    },
    {
      image: demoEquipos,
      titleKey: 'landing.demo.teamsTitle',
      descKey: 'landing.demo.teamsDesc',
    },
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
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('landing.hero.demo')}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('landing.hero.noCard')}
          </p>
        </div>
      </section>

      {/* Demo Section - Redesigned */}
      <section id="demo" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t('landing.demo.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">
            {t('landing.demo.subtitle')}
          </p>
          
          {/* Demo Screens Grid */}
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {demoScreens.map((screen, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${index % 2 === 1 ? 'md:flex-col-reverse' : ''} gap-6 items-center`}
              >
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <img 
                    src={screen.image} 
                    alt={t(screen.titleKey)} 
                    className="relative rounded-2xl shadow-2xl max-h-[500px] w-auto object-contain border border-border/50"
                  />
                </div>
                <div className="text-center md:text-left max-w-sm">
                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {t(screen.titleKey)}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t(screen.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
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
      <section className="py-20 px-4 bg-muted/30">
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
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            {t('landing.pricing.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">{t('landing.pricing.free.name')}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t('landing.pricing.free.desc')}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold">0€</span>
                  <span className="text-muted-foreground text-sm">/{t('landing.pricing.month')}</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full" size="sm">
                    {t('landing.getStarted')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Starter Plan */}
            <Card className="relative overflow-hidden border-primary/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">{t('landing.pricing.starter.name')}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t('landing.pricing.starter.desc')}</p>
                <div className="mb-2">
                  <span className="text-3xl font-bold">5€</span>
                  <span className="text-muted-foreground text-sm">/{t('landing.pricing.month')}</span>
                </div>
                <p className="text-xs text-primary mb-4">
                  {t('landing.pricing.year')}: 40€ ({t('subscription.saveYearly', { percent: '33%' })})
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {starterFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full" size="sm">
                    {t('landing.pricing.subscribe')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative overflow-hidden border-primary shadow-lg">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                {t('landing.pricing.popular')}
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">{t('landing.pricing.pro.name')}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t('landing.pricing.pro.desc')}</p>
                <div className="mb-2">
                  <span className="text-3xl font-bold">15€</span>
                  <span className="text-muted-foreground text-sm">/{t('landing.pricing.month')}</span>
                </div>
                <p className="text-xs text-primary mb-4">
                  {t('landing.pricing.year')}: 120€ ({t('subscription.saveYearly', { percent: '33%' })})
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full" size="sm">
                    {t('landing.pricing.subscribe')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">{t('landing.pricing.elite.name')}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t('landing.pricing.elite.desc')}</p>
                <div className="mb-4">
                  <span className="text-2xl font-bold">{t('landing.pricing.custom')}</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  {eliteFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>
                <a href="mailto:info@topvolleymanager.com" className="block">
                  <Button variant="outline" className="w-full" size="sm">
                    {t('landing.pricing.contactUs')}
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/30">
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
      <footer className="py-12 px-4 border-t">
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
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground text-sm">
                {t('landing.footer.privacy')}
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground text-sm">
                {t('landing.footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}
