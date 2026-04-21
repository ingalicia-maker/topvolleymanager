import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExerciseCategory = Tables<"exercise_categories">;
export type ExerciseScope = Tables<"exercise_scopes">;
export type Exercise = Tables<"exercises"> & {
  category?: ExerciseCategory | null;
  scope?: ExerciseScope | null;
};

export function useExerciseCategories() {
  return useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_categories")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as ExerciseCategory[];
    },
  });
}

export function useExerciseScopes() {
  return useQuery({
    queryKey: ["exercise-scopes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_scopes")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as ExerciseScope[];
    },
  });
}

export function useExercises(categorySlug?: string, scopeSlug?: string) {
  return useQuery({
    queryKey: ["exercises", categorySlug, scopeSlug],
    queryFn: async () => {
      let categoryFilterId: string | null = null;
      let scopeFilterId: string | null = null;

      if (categorySlug) {
        const { data: category } = await supabase
          .from("exercise_categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (category) categoryFilterId = category.id;
      }

      if (scopeSlug) {
        const { data: scope } = await supabase
          .from("exercise_scopes")
          .select("id")
          .eq("slug", scopeSlug)
          .maybeSingle();
        if (scope) scopeFilterId = scope.id;
      }

      let allowedIds: string[] | null = null;
      if (categoryFilterId) {
        const { data: links } = await supabase
          .from("exercise_category_links" as any)
          .select("exercise_id")
          .eq("category_id", categoryFilterId);
        allowedIds = (links as any[] | null)?.map((l) => l.exercise_id) ?? [];
      }
      if (scopeFilterId) {
        const { data: links } = await supabase
          .from("exercise_scope_links" as any)
          .select("exercise_id")
          .eq("scope_id", scopeFilterId);
        const scopeIds = (links as any[] | null)?.map((l) => l.exercise_id) ?? [];
        allowedIds = allowedIds === null ? scopeIds : allowedIds.filter((id) => scopeIds.includes(id));
      }

      let query = supabase
        .from("exercises")
        .select(`
          *,
          category:exercise_categories(*),
          scope:exercise_scopes(*)
        `)
        .eq("is_published", true)
        .order("order_index");

      if (allowedIds !== null) {
        if (allowedIds.length === 0) return [];
        query = query.in("id", allowedIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Exercise[];
    },
  });
}

export function useExercisesCount() {
  return useQuery({
    queryKey: ["exercises-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("exercises")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useExercise(slug: string) {
  return useQuery({
    queryKey: ["exercise", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select(`
          *,
          category:exercise_categories(*),
          scope:exercise_scopes(*)
        `)
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from("exercises")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);

      return data as Exercise;
    },
    enabled: !!slug,
  });
}
