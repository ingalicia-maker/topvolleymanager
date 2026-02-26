import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExercises, useExerciseCategories, useExerciseScopes } from "@/hooks/useExercises";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseDetailDialog } from "@/components/ExerciseDetailDialog";
import { CreateExerciseDialog } from "@/components/CreateExerciseDialog";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import type { Exercise } from "@/hooks/useExercises";
import { Search, Filter, Dumbbell, ArrowLeft, Plus, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as LucideIcons from "lucide-react";

export default function Exercises() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0] as "es" | "en" | "it";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const { favorites } = useExerciseFavorites();

  const { data: categories, isLoading: categoriesLoading } = useExerciseCategories();
  const { data: scopes, isLoading: scopesLoading } = useExerciseScopes();
  const { data: exercises, isLoading: exercisesLoading } = useExercises(
    selectedCategory !== "all" ? selectedCategory : undefined,
    selectedScope !== "all" ? selectedScope : undefined
  );

  const getCategoryName = (category: typeof categories extends (infer T)[] ? T : never) => {
    const key = `name_${lang}` as keyof typeof category;
    return (category[key] as string) || category.name_es;
  };

  const getScopeName = (scope: typeof scopes extends (infer T)[] ? T : never) => {
    const key = `name_${lang}` as keyof typeof scope;
    return (scope[key] as string) || scope.name_es;
  };

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    target: LucideIcons.Target,
    "move-horizontal": LucideIcons.MoveHorizontal,
    zap: LucideIcons.Zap,
    shuffle: LucideIcons.Shuffle,
    shield: LucideIcons.Shield,
    "user-check": LucideIcons.UserCheck,
    users: LucideIcons.Users,
    activity: LucideIcons.Activity,
    "trending-up": LucideIcons.TrendingUp,
    "users-round": LucideIcons.UsersRound,
    repeat: LucideIcons.Repeat,
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Dumbbell;
    return iconMap[iconName] || Dumbbell;
  };

  const filteredExercises = exercises?.filter((exercise) => {
    if (showFavorites && !favorites.includes(exercise.id)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = (exercise[`title_${lang}` as keyof typeof exercise] as string || exercise.title_es || "").toLowerCase();
    const purpose = (exercise[`purpose_${lang}` as keyof typeof exercise] as string || exercise.purpose_es || "").toLowerCase();
    return title.includes(query) || purpose.includes(query);
  });

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDialogOpen(true);
  };

  return (
    <AuthGuard>
      <Helmet>
        <title>{t("exercises.pageTitle")} | Top Volley Manager</title>
        <meta name="description" content={t("exercises.pageDescription")} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <Dumbbell className="h-10 w-10" />
              <h1 className="text-3xl md:text-4xl font-bold">{t("exercises.title")}</h1>
            </div>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mb-4">
              {t("exercises.subtitle")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("exercises.createExercise")}
              </Button>
              <Button
                variant={showFavorites ? "default" : "outline"}
                onClick={() => setShowFavorites(!showFavorites)}
                className={`gap-2 ${!showFavorites ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30" : "bg-primary-foreground text-primary"}`}
              >
                <Heart className={`h-4 w-4 ${showFavorites ? "fill-current" : ""}`} />
                {t("exercises.favorites")}
              </Button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-8">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("exercises.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("exercises.scope")}:</span>
              </div>
              {scopesLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : (
                <Tabs value={selectedScope} onValueChange={setSelectedScope}>
                  <TabsList>
                    <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
                    {scopes?.map((scope) => (
                      <TabsTrigger key={scope.id} value={scope.slug}>
                        {getScopeName(scope)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">{t("exercises.category")}:</span>
            </div>
            {categoriesLoading ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-32" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile: Select */}
                <div className="lg:hidden">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("exercises.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {getCategoryName(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Desktop: Buttons */}
                <div className="hidden lg:flex gap-2 flex-wrap">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    {t("common.all")}
                  </Button>
                  {categories?.map((category) => {
                    const Icon = getIcon(category.icon);
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.slug ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.slug)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {getCategoryName(category)}
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6">
            {filteredExercises?.length || 0} {t("exercises.exercisesFound")}
          </p>

          {/* Exercises Grid */}
          {exercisesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredExercises && filteredExercises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => handleExerciseClick(exercise)}
                  isFavorite={favorites.includes(exercise.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t("exercises.noExercisesFound")}</h3>
              <p className="text-muted-foreground">{t("exercises.tryAdjustingFilters")}</p>
            </div>
          )}
        </div>

        {/* Exercise Detail Dialog */}
        <ExerciseDetailDialog
          exercise={selectedExercise}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        {/* Create Exercise Dialog */}
        <CreateExerciseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </AuthGuard>
  );
}
