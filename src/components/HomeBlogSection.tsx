import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBlogArticles, getCategoryName } from '@/hooks/useBlog';
import { format } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeBlogSection() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('it') ? 'it' : 'es';
  const { data: articles, isLoading } = useBlogArticles({ publishedOnly: true, language: currentLang });

  const getLocale = () => {
    switch (currentLang) {
      case 'en': return enUS;
      case 'it': return it;
      default: return es;
    }
  };

  const visibleArticles = articles?.filter((article) => {
    if (!article.published_at) return false;
    return new Date(article.published_at) <= new Date();
  });
  const latestArticles = visibleArticles?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!latestArticles.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">{t('home.blog.title')}</h2>
        </div>
        <Link to="/blog" className="text-sm text-primary font-medium">
          {t('common.viewAll')}
        </Link>
      </div>
      <div className="space-y-3">
        {latestArticles.map((article) => (
          <Link key={article.id} to={`/blog/${article.slug}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {article.featured_image && (
                    <img
                      src={article.featured_image}
                      alt={article.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {article.category && (
                      <Badge variant="secondary" className="text-xs mb-1">
                        {getCategoryName(article.category, currentLang)}
                      </Badge>
                    )}
                    <h3 className="font-medium text-sm line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {article.published_at && format(new Date(article.published_at), 'PP', { locale: getLocale() })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="text-center mt-3">
        <Link to="/blog">
          <Button variant="outline" size="sm">
            {t('home.blog.viewMore')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
