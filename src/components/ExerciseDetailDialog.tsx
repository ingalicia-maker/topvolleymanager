import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import type { Exercise } from "@/hooks/useExercises";
import { Users, Star, Eye } from "lucide-react";

interface ExerciseDetailDialogProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseDetailDialog({ exercise, open, onOpenChange }: ExerciseDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0] as "es" | "en" | "it";

  if (!exercise) return null;

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
        className={`h-4 w-4 ${i < exercise.difficulty ? "fill-primary text-primary" : "text-muted-foreground"}`}
      />
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary">{getCategoryName()}</Badge>
            <Badge variant="outline">{getScopeName()}</Badge>
          </div>
          <DialogTitle className="text-2xl">{getLocalizedField("title")}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              {getDifficultyStars()}
              <span className="ml-1">{t("exercises.difficulty")}</span>
            </div>
            {(exercise.min_players || exercise.max_players) && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {exercise.min_players === exercise.max_players
                    ? exercise.min_players
                    : `${exercise.min_players}-${exercise.max_players}`} {t("exercises.players")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{exercise.view_count}</span>
            </div>
          </div>
        </DialogHeader>

        {exercise.image_url && (
          <div className="aspect-video w-full overflow-hidden rounded-lg my-4">
            <img
              src={exercise.image_url}
              alt={getLocalizedField("title")}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-6">
          {getLocalizedField("purpose") && (
            <div>
              <h3 className="font-semibold text-lg mb-2">{t("exercises.purpose")}</h3>
              <p className="text-muted-foreground">{getLocalizedField("purpose")}</p>
            </div>
          )}

          <Separator />

          {getLocalizedField("how_it_works") && (
            <div>
              <h3 className="font-semibold text-lg mb-2">{t("exercises.howItWorks")}</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{getLocalizedField("how_it_works")}</p>
            </div>
          )}

          {getLocalizedField("variations") && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-2">{t("exercises.variations")}</h3>
                <p className="text-muted-foreground">{getLocalizedField("variations")}</p>
              </div>
            </>
          )}

          {getLocalizedField("requirements") && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-2">{t("exercises.requirements")}</h3>
                <p className="text-muted-foreground">{getLocalizedField("requirements")}</p>
              </div>
            </>
          )}

          {exercise.diagram_url && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-2">{t("exercises.diagram")}</h3>
                <img
                  src={exercise.diagram_url}
                  alt={`${getLocalizedField("title")} diagram`}
                  className="w-full rounded-lg"
                />
              </div>
            </>
          )}

          {exercise.video_url && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-2">{t("exercises.video")}</h3>
                <div className="aspect-video">
                  <iframe
                    src={exercise.video_url}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
