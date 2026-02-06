import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CookieBanner } from "@/components/CookieBanner";
import { AuthGuard } from "@/components/AuthGuard";
import { useBlogArticles, useBlogCategories } from "@/hooks/useBlog";
import { format } from "date-fns";
import { es, enUS, it } from "date-fns/locale";
import { Calendar, ArrowRight, FileText } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Blog() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('it') ? 'it' : 'es';
  const { data: articles, isLoading } = useBlogArticles({ publishedOnly: true, language: currentLang });
  const { data: categories } = useBlogCategories();

  const getDateLocale = () => {
    switch (i18n.language) {
      case "en":
        return enUS;
      case "it":
        return it;
      default:
        return es;
    }
  };

  // Filter articles to only show those with published_at <= today
  const visibleArticles = articles?.filter((article) => {
    if (!article.published_at) return false;
    return new Date(article.published_at) <= new Date();
  });

  return (
    <AuthGuard>
      <Helmet>
        <title>Blog - Top Volley Manager | Artículos sobre voleibol</title>
        <meta
          name="description"
          content="Artículos, consejos y recursos sobre gestión de equipos de voleibol, entrenamientos, tácticas y más."
        />
        <link rel="canonical" href="https://topvolleymanager.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/landing" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">TVM</span>
              <span className="hidden sm:inline text-lg font-semibold">Blog</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Link to="/landing">
                <Button variant="outline" size="sm">
                  Comenzar
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Blog de Voleibol</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Consejos, técnicas y recursos para entrenadores y directores deportivos de voleibol
            </p>
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {categories.map((category) => (
                <Badge key={category.id} variant="outline" className="text-sm">
                  {category.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Articles Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : visibleArticles?.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Próximamente publicaremos artículos sobre voleibol
                </p>
                <Link to="/landing">
                  <Button className="mt-4">Conoce nuestra app</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleArticles?.map((article) => (
                <Link key={article.id} to={`/blog/${article.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    {article.featured_image && (
                      <div className="aspect-video bg-muted overflow-hidden rounded-t-lg">
                        <img
                          src={article.featured_image}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader>
                      {article.category && (
                        <Badge variant="secondary" className="w-fit mb-2">
                          {article.category.name}
                        </Badge>
                      )}
                      <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {article.excerpt && (
                        <p className="text-muted-foreground line-clamp-3 mb-4">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {article.published_at &&
                            format(new Date(article.published_at), "d MMM yyyy", {
                              locale: getDateLocale(),
                            })}
                        </div>
                        <span className="flex items-center gap-1 text-primary">
                          Leer más <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 text-center bg-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              ¿Listo para gestionar tu equipo como un profesional?
            </h2>
            <p className="text-muted-foreground mb-6">
              Top Volley Manager te ayuda a organizar convocatorias, controlar ausencias y mucho más.
            </p>
            <Link to="/landing">
              <Button size="lg">
                Comenzar gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Top Volley Manager. Todos los derechos reservados.</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/privacy" className="hover:text-primary">
                Política de Privacidad
              </Link>
              <Link to="/terms" className="hover:text-primary">
                Términos de Uso
              </Link>
            </div>
          </div>
        </footer>

        <CookieBanner />
      </div>
    </AuthGuard>
  );
}
