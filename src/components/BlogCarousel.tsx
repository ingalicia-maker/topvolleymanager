import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useBlogArticles } from '@/hooks/useBlog';
import { format } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import { Calendar, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function BlogCarousel() {
  const { t, i18n } = useTranslation();
  const { data: articles, isLoading } = useBlogArticles({ publishedOnly: true });
  const currentLang = i18n.language.split('-')[0] || 'es';

  const getLocale = () => {
    switch (currentLang) {
      case 'en': return enUS;
      case 'it': return it;
      default: return es;
    }
  };

  // Get latest 6 articles
  const latestArticles = articles?.slice(0, 6) || [];

  if (isLoading) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!latestArticles.length) {
    return null;
  }

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('landing.blog.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('landing.blog.subtitle')}
          </p>
        </div>

        {/* Desktop: Carousel */}
        <div className="hidden md:block">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {latestArticles.map((article) => (
                <CarouselItem key={article.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <Link to={`/blog/${article.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                      <CardContent className="p-6 flex flex-col h-full">
                        {article.category && (
                          <Badge variant="secondary" className="self-start mb-3">
                            {article.category.name}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                          <Calendar className="h-3 w-3" />
                          {article.published_at && format(new Date(article.published_at), 'PPP', { locale: getLocale() })}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-12" />
            <CarouselNext className="-right-12" />
          </Carousel>
        </div>

        {/* Mobile: Grid */}
        <div className="md:hidden grid gap-4">
          {latestArticles.slice(0, 3).map((article) => (
            <Link key={article.id} to={`/blog/${article.slug}`}>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      {article.category && (
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {article.category.name}
                        </Badge>
                      )}
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {article.published_at && format(new Date(article.published_at), 'PP', { locale: getLocale() })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Link to="/blog">
            <Button variant="outline" size="lg">
              {t('landing.blog.viewAll')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
