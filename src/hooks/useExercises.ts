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
      let query = supabase
        .from("exercises")
        .select(`
          *,
          category:exercise_categories(*),
          scope:exercise_scopes(*)
        `)
        .eq("is_published", true)
        .order("order_index");

      if (categorySlug) {
        const { data: category } = await supabase
          .from("exercise_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      if (scopeSlug) {
        const { data: scope } = await supabase
          .from("exercise_scopes")
          .select("id")
          .eq("slug", scopeSlug)
          .single();
        
        if (scope) {
          query = query.eq("scope_id", scope.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Exercise[];
    },
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
