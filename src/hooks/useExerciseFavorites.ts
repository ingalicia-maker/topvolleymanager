import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useExerciseFavorites() {
  const { user } = useAuth();

  const { data: favorites = [], ...rest } = useQuery({
    queryKey: ["exercise-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_favorites")
        .select("exercise_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((f) => f.exercise_id);
    },
    enabled: !!user,
  });

  return { favorites, ...rest };
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ exerciseId, isFavorite }: { exerciseId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFavorite) {
        const { error } = await supabase
          .from("exercise_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("exercise_id", exerciseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("exercise_favorites")
          .insert({ user_id: user.id, exercise_id: exerciseId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-favorites"] });
    },
  });
}
