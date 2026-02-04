import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import type { Exercise } from "@/hooks/useExercises";
import { Users, Star } from "lucide-react";

interface ExerciseCardProps {
  exercise: Exercise;
  onClick: () => void;
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.split("-")[0] as "es" | "en" | "it";

  const getLocalizedField = (field: string) => {
    const key = `${field}_${lang}` as keyof typeof exercise;
    return (exercise[key] as string) || (exercise[`${field}_es` as keyof typeof exercise] as string);
  };

  const getCategoryName = () => {
    if (!exercise.category) return "";
    const key = `name_${lang}` as keyof typeof exercise.category;
    return (exercise.category[key] as string) || exercise.category.name_es;
  };

  const getScopeName = () => {
    if (!exercise.scope) return "";
    const key = `name_${lang}` as keyof typeof exercise.scope;
    return (exercise.scope[key] as string) || exercise.scope.name_es;
  };

  const getDifficultyStars = () => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < exercise.difficulty ? "fill-primary text-primary" : "text-muted-foreground"}`}
      />
    ));
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-full flex flex-col"
      onClick={onClick}
    >
      {exercise.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img
            src={exercise.image_url}
            alt={getLocalizedField("title")}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {getCategoryName()}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getScopeName()}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">{getLocalizedField("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {getLocalizedField("purpose")}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1">
            {getDifficultyStars()}
          </div>
          {(exercise.min_players || exercise.max_players) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {exercise.min_players === exercise.max_players
                  ? exercise.min_players
                  : `${exercise.min_players}-${exercise.max_players}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
