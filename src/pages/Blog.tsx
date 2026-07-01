import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CookieBanner } from "@/components/CookieBanner";
import { useBlogArticles, useBlogCategories, getCategoryName } from "@/hooks/useBlog";
import { format } from "date-fns";
import { es, enUS, it } from "date-fns/locale";
import { Calendar, ArrowRight, FileText } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Blog() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('it') ? 'it' : 'es';
  const ogLocale = currentLang === 'en' ? 'en_US' : currentLang === 'it' ? 'it_IT' : 'es_ES';
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
    <>
      {/* Helmet OUTSIDE AuthGuard so SEO meta is rendered even for non-authenticated crawlers */}
      <Helmet>
        <html lang={currentLang} />
        <title>{t('blog.pageTitle')}</title>
        <meta name="description" content={t('blog.metaDescription')} />
        <link rel="canonical" href="https://www.topvolleymanager.com/blog" />
        <link rel="alternate" hrefLang="es" href="https://www.topvolleymanager.com/blog" />
        <link rel="alternate" hrefLang="en" href="https://www.topvolleymanager.com/blog" />
        <link rel="alternate" hrefLang="it" href="https://www.topvolleymanager.com/blog" />
        <link rel="alternate" hrefLang="x-default" href="https://www.topvolleymanager.com/blog" />
        <meta property="og:title" content={t('blog.pageTitle')} />
        <meta property="og:description" content={t('blog.metaDescription')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.topvolleymanager.com/blog" />
        <meta property="og:image" content="https://www.topvolleymanager.com/og-image.png" />
        <meta property="og:locale" content={ogLocale} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('blog.pageTitle')} />
        <meta name="twitter:description" content={t('blog.metaDescription')} />
        <meta name="twitter:image" content="https://www.topvolleymanager.com/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Top Volley Manager Blog",
            url: "https://www.topvolleymanager.com/blog",
            description: t('blog.metaDescription'),
            inLanguage: ["es-ES", "en-US", "it-IT"],
            publisher: {
              "@type": "Organization",
              name: "Top Volley Manager",
              url: "https://www.topvolleymanager.com",
              logo: { "@type": "ImageObject", url: "https://www.topvolleymanager.com/favicon.png" }
            }
          })}
        </script>
      </Helmet>

      {/* Public content page — no AuthGuard so crawlers can index it */}
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
                  {t('blog.cta')}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{t('blog.heroTitle')}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('blog.heroSubtitle')}
            </p>
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {categories.map((category) => (
                <Badge key={category.id} variant="outline" className="text-sm">
                  {getCategoryName(category, currentLang)}
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
                  {t('blog.noArticles')}
                </p>
                <Link to="/landing">
                  <Button className="mt-4">{t('blog.discoverApp')}</Button>
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
                          {getCategoryName(article.category, currentLang)}
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
                          {t('blog.readMore')} <ArrowRight className="h-4 w-4" />
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
              {t('blog.ctaTitle')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('blog.ctaSubtitle')}
            </p>
            <Link to="/landing">
              <Button size="lg">
                {t('blog.ctaButton')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Top Volley Manager. {t('blog.allRightsReserved')}</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/privacy" className="hover:text-primary">
                {t('blog.privacy')}
              </Link>
              <Link to="/terms" className="hover:text-primary">
                {t('blog.terms')}
              </Link>
            </div>
          </div>
        </footer>

        <CookieBanner />
      </div>
    </>
  );
}
