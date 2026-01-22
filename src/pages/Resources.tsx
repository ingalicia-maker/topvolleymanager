import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CookieBanner } from "@/components/CookieBanner";
import { Helmet } from "react-helmet-async";
import { 
  Download, 
  FileText, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";

interface Resource {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  downloadUrl: string;
  category: string;
}

const resources: Resource[] = [
  {
    id: "team-management-guide",
    titleKey: "resources.guides.teamManagement.title",
    descriptionKey: "resources.guides.teamManagement.description",
    icon: Users,
    downloadUrl: "/guides/guia-gestion-equipos-voleibol.pdf",
    category: "management"
  },
  {
    id: "training-planning",
    titleKey: "resources.guides.trainingPlanning.title",
    descriptionKey: "resources.guides.trainingPlanning.description",
    icon: Calendar,
    downloadUrl: "/guides/planificacion-entrenamientos.pdf",
    category: "training"
  },
  {
    id: "player-evaluation",
    titleKey: "resources.guides.playerEvaluation.title",
    descriptionKey: "resources.guides.playerEvaluation.description",
    icon: Target,
    downloadUrl: "/guides/evaluacion-jugadores.pdf",
    category: "evaluation"
  },
  {
    id: "season-planning",
    titleKey: "resources.guides.seasonPlanning.title",
    descriptionKey: "resources.guides.seasonPlanning.description",
    icon: TrendingUp,
    downloadUrl: "/guides/planificacion-temporada.pdf",
    category: "planning"
  },
  {
    id: "communication-parents",
    titleKey: "resources.guides.parentCommunication.title",
    descriptionKey: "resources.guides.parentCommunication.description",
    icon: BookOpen,
    downloadUrl: "/guides/comunicacion-padres.pdf",
    category: "communication"
  },
  {
    id: "attendance-template",
    titleKey: "resources.guides.attendanceTemplate.title",
    descriptionKey: "resources.guides.attendanceTemplate.description",
    icon: FileText,
    downloadUrl: "/guides/plantilla-asistencia.pdf",
    category: "templates"
  }
];

export default function Resources() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error(t("resources.form.requiredFields"));
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call - In production, this would save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubscribed(true);
    setIsSubmitting(false);
    toast.success(t("resources.form.successMessage"));
  };

  const handleDownload = (resource: Resource) => {
    if (!isSubscribed) {
      toast.error(t("resources.downloadError"));
      return;
    }
    // In production, this would track downloads
    window.open(resource.downloadUrl, "_blank");
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("resources.pageTitle"),
    description: t("resources.metaDescription"),
    url: "https://topvolleymanager.com/resources",
    publisher: {
      "@type": "Organization",
      name: "Top Volley Manager",
      url: "https://topvolleymanager.com"
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: resources.map((resource, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "DigitalDocument",
          name: t(resource.titleKey),
          description: t(resource.descriptionKey),
          url: `https://topvolleymanager.com${resource.downloadUrl}`,
          fileFormat: "application/pdf"
        }
      }))
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("resources.pageTitle")} | Top Volley Manager</title>
        <meta name="description" content={t("resources.metaDescription")} />
        <link rel="canonical" href="https://topvolleymanager.com/resources" />
        <meta property="og:title" content={t("resources.pageTitle")} />
        <meta property="og:description" content={t("resources.metaDescription")} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://topvolleymanager.com/resources" />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/landing" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">TVM</span>
              <span className="hidden sm:inline text-lg font-semibold">{t("resources.header")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Link to="/landing">
                <Button variant="outline" size="sm">
                  {t("landing.getStarted")}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <section className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t("resources.heroTitle")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("resources.heroSubtitle")}
            </p>
          </section>

          {/* Lead Capture Form */}
          {!isSubscribed ? (
            <section className="max-w-md mx-auto mb-16">
              <Card className="border-primary/20">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    {t("resources.form.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("resources.form.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t("auth.name")}</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("resources.form.namePlaceholder")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("resources.form.emailPlaceholder")}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t("common.loading") : t("resources.form.submit")}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {t("resources.form.privacy")}
                    </p>
                  </form>
                </CardContent>
              </Card>
            </section>
          ) : (
          <section className="max-w-md mx-auto mb-16">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t("resources.form.successTitle")}</h3>
                  <p className="text-muted-foreground">{t("resources.form.successSubtitle")}</p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Resources Grid */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">{t("resources.availableGuides")}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <Card 
                    key={resource.id} 
                    className={`transition-all duration-200 ${
                      isSubscribed 
                        ? "hover:shadow-lg hover:border-primary/50 cursor-pointer" 
                        : "opacity-75"
                    }`}
                    onClick={() => isSubscribed && handleDownload(resource)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{t(resource.titleKey)}</CardTitle>
                          <CardDescription className="mt-1">
                            {t(resource.descriptionKey)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          PDF
                        </span>
                        {isSubscribed ? (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            {t("resources.download")}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t("resources.unlockFirst")}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-primary/5 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t("resources.ctaTitle")}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t("resources.ctaSubtitle")}
            </p>
            <Link to="/landing">
              <Button size="lg">
                {t("landing.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Top Volley Manager. {t("landing.footer.rights")}</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/privacy" className="hover:text-primary">
                {t("landing.footer.privacy")}
              </Link>
              <Link to="/terms" className="hover:text-primary">
                {t("landing.footer.terms")}
              </Link>
              <Link to="/blog" className="hover:text-primary">
                Blog
              </Link>
            </div>
          </div>
        </footer>

        <CookieBanner />
      </div>
    </>
  );
}
