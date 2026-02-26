import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useExerciseCategories, useExerciseScopes } from "@/hooks/useExercises";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateExerciseDialog({ open, onOpenChange }: CreateExerciseDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0] as "es" | "en" | "it";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories } = useExerciseCategories();
  const { data: scopes } = useExerciseScopes();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [variations, setVariations] = useState("");
  const [requirements, setRequirements] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [minPlayers, setMinPlayers] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");

  const getCategoryName = (cat: NonNullable<typeof categories>[number]) => {
    const key = `name_${lang}` as keyof typeof cat;
    return (cat[key] as string) || cat.name_es;
  };

  const getScopeName = (scope: NonNullable<typeof scopes>[number]) => {
    const key = `name_${lang}` as keyof typeof scope;
    return (scope[key] as string) || scope.name_es;
  };

  const resetForm = () => {
    setTitle("");
    setPurpose("");
    setHowItWorks("");
    setVariations("");
    setRequirements("");
    setCategoryId("");
    setScopeId("");
    setDifficulty(1);
    setMinPlayers("");
    setMaxPlayers("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !categoryId || !scopeId || !title.trim()) return;

    setLoading(true);
    try {
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        + "-" + Date.now();

      const exerciseData = {
        slug,
        category_id: categoryId,
        scope_id: scopeId,
        difficulty,
        min_players: minPlayers ? parseInt(minPlayers) : null,
        max_players: maxPlayers ? parseInt(maxPlayers) : null,
        is_published: true,
        created_by: user.id,
        [`title_${lang}`]: title.trim(),
        title_es: lang === "es" ? title.trim() : title.trim(),
        title_en: lang === "en" ? title.trim() : title.trim(),
        title_it: lang === "it" ? title.trim() : title.trim(),
        [`purpose_${lang}`]: purpose.trim() || null,
        [`how_it_works_${lang}`]: howItWorks.trim() || null,
        [`variations_${lang}`]: variations.trim() || null,
        [`requirements_${lang}`]: requirements.trim() || null,
      };

      const { error } = await supabase.from("exercises").insert(exerciseData as any);
      if (error) throw error;

      toast.success(t("exercises.exerciseCreated"));
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("exercises.createExercise")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t("exercises.exerciseTitle")} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("exercises.category")} *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("exercises.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("exercises.scope")} *</Label>
              <Select value={scopeId} onValueChange={setScopeId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("exercises.selectScope")} />
                </SelectTrigger>
                <SelectContent>
                  {scopes?.map((scope) => (
                    <SelectItem key={scope.id} value={scope.id}>
                      {getScopeName(scope)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("exercises.difficulty")}</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${level <= difficulty ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("exercises.minPlayers")}</Label>
              <Input
                type="number"
                min={1}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("exercises.maxPlayers")}</Label>
              <Input
                type="number"
                min={1}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("exercises.purpose")}</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t("exercises.howItWorks")}</Label>
            <Textarea value={howItWorks} onChange={(e) => setHowItWorks(e.target.value)} rows={4} />
          </div>

          <div>
            <Label>{t("exercises.variations")}</Label>
            <Textarea value={variations} onChange={(e) => setVariations(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t("exercises.requirements")}</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !categoryId || !scopeId}>
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
