import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CookieBanner } from "@/components/CookieBanner";
import { AuthGuard } from "@/components/AuthGuard";
import { useBlogArticle, getCategoryName } from "@/hooks/useBlog";
import { format } from "date-fns";
import { es, enUS, it } from "date-fns/locale";
import { ArrowLeft, Calendar, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('it') ? 'it' : 'es';
  const { data: article, isLoading, error } = useBlogArticle(slug || "");

  const getDateLocale = () => {
    switch (currentLang) {
      case "en": return enUS;
      case "it": return it;
      default: return es;
    }
  };

  // Simple markdown-like rendering (basic)
  const renderContent = (content: string) => {
    return content.split("\n\n").map((paragraph, idx) => {
      if (paragraph.startsWith("### ")) {
        return <h3 key={idx} className="text-xl font-semibold mt-6 mb-3">{paragraph.replace("### ", "")}</h3>;
      }
      if (paragraph.startsWith("## ")) {
        return <h2 key={idx} className="text-2xl font-bold mt-8 mb-4">{paragraph.replace("## ", "")}</h2>;
      }
      if (paragraph.startsWith("# ")) {
        return <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">{paragraph.replace("# ", "")}</h1>;
      }
      if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
        const items = paragraph.split("\n").filter((line) => line.trim());
        return (
          <ul key={idx} className="list-disc list-inside space-y-2 my-4">
            {items.map((item, i) => <li key={i}>{item.replace(/^[-*]\s/, "")}</li>)}
          </ul>
        );
      }
      let formatted = paragraph
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      return <p key={idx} className="mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/blog" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">TVM</span>
              <span className="text-lg font-semibold">Blog</span>
            </Link>
            <LanguageSelector />
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('blog.articleNotFound')}</h1>
          <p className="text-muted-foreground mb-8">{t('blog.articleNotFoundDesc')}</p>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('blog.backToBlog')}
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const langCode = article.language || currentLang;
  const inLanguage = langCode === "en" ? "en-US" : langCode === "it" ? "it-IT" : "es-ES";

  return (
    <AuthGuard>
      <Helmet>
        <title>{article.title} - Blog | Top Volley Manager</title>
        <meta name="description" content={article.meta_description || article.excerpt || article.title} />
        <link rel="canonical" href={`https://topvolleymanager.com/blog/${article.slug}`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://topvolleymanager.com/blog/${article.slug}`} />
        {article.featured_image && <meta property="og:image" content={article.featured_image} />}
        <meta property="article:published_time" content={article.published_at || ""} />
        <meta httpEquiv="content-language" content={inLanguage} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `https://topvolleymanager.com/blog/${article.slug}#article`,
            headline: article.title,
            name: article.title,
            description: article.meta_description || article.excerpt,
            datePublished: article.published_at,
            dateModified: article.updated_at,
            dateCreated: article.created_at,
            url: `https://topvolleymanager.com/blog/${article.slug}`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://topvolleymanager.com/blog/${article.slug}`
            },
            image: article.featured_image ? {
              "@type": "ImageObject",
              url: article.featured_image,
              width: 1200,
              height: 630
            } : undefined,
            author: {
              "@type": "Organization",
              name: "Top Volley Manager",
              url: "https://topvolleymanager.com"
            },
            publisher: {
              "@type": "Organization",
              name: "Top Volley Manager",
              url: "https://topvolleymanager.com",
              logo: {
                "@type": "ImageObject",
                url: "https://topvolleymanager.com/favicon.png",
                width: 512,
                height: 512
              }
            },
            articleSection: article.category?.name || "Voleibol",
            keywords: article.tags?.join(", ") || "voleibol, gestión deportiva",
            inLanguage,
            isAccessibleForFree: true,
            isPartOf: {
              "@type": "Blog",
              "@id": "https://topvolleymanager.com/blog",
              name: "Blog de Top Volley Manager",
              url: "https://topvolleymanager.com/blog"
            }
          })}
        </script>
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://topvolleymanager.com" },
              { "@type": "ListItem", position: 2, name: "Blog", item: "https://topvolleymanager.com/blog" },
              { "@type": "ListItem", position: 3, name: article.title, item: `https://topvolleymanager.com/blog/${article.slug}` }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/blog" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">TVM</span>
              <span className="hidden sm:inline text-lg font-semibold">Blog</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Link to="/landing">
                <Button variant="outline" size="sm">{t('blog.cta')}</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('blog.backToBlog')}
          </Link>

          <article className="max-w-3xl mx-auto">
            <header className="mb-8">
              {article.category && (
                <Badge variant="secondary" className="mb-4">
                  {getCategoryName(article.category, currentLang)}
                </Badge>
              )}
              <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
              {article.excerpt && <p className="text-xl text-muted-foreground mb-4">{article.excerpt}</p>}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {article.published_at && format(new Date(article.published_at), "d MMMM yyyy", { locale: getDateLocale() })}
              </div>
            </header>

            {article.featured_image && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-8">
                <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-lg max-w-none">{renderContent(article.content)}</div>

            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
              </div>
            )}
          </article>

          <div className="max-w-3xl mx-auto mt-16 text-center bg-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">{t('blog.likedArticle')}</h2>
            <p className="text-muted-foreground mb-6">{t('blog.likedArticleDesc')}</p>
            <Link to="/landing">
              <Button size="lg">
                {t('blog.startFree')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>

        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Top Volley Manager. {t('blog.allRightsReserved')}</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/privacy" className="hover:text-primary">{t('blog.privacy')}</Link>
              <Link to="/terms" className="hover:text-primary">{t('blog.terms')}</Link>
            </div>
          </div>
        </footer>

        <CookieBanner />
      </div>
    </AuthGuard>
  );
}
