import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BlogCategory = Tables<"blog_categories">;

export type BlogArticle = Tables<"blog_articles"> & {
  category?: BlogCategory | null;
};

export interface CreateArticleData {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category_id?: string;
  tags?: string[];
  featured_image?: string;
  meta_description?: string;
  is_published?: boolean;
}

export interface UpdateArticleData extends Partial<CreateArticleData> {
  id: string;
}

export function useBlogCategories() {
  return useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as BlogCategory[];
    },
  });
}

export function useBlogArticles(options?: { publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["blog-articles", options?.publishedOnly],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles")
        .select(`
          *,
          category:blog_categories(*)
        `)
        .order("published_at", { ascending: false, nullsFirst: false });

      if (options?.publishedOnly) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data as BlogArticle[];
    },
  });
}

export function useBlogArticle(slug: string) {
  return useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select(`
          *,
          category:blog_categories(*)
        `)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      
      return data as BlogArticle;
    },
    enabled: !!slug,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateArticleData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: article, error } = await supabase
        .from("blog_articles")
        .insert({
          ...data,
          author_id: user.user?.id,
          published_at: data.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateArticleData) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // Set published_at when publishing for the first time
      if (data.is_published) {
        const { data: existing } = await supabase
          .from("blog_articles")
          .select("published_at")
          .eq("id", id)
          .single();
        
        if (!existing?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data: article, error } = await supabase
        .from("blog_articles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      queryClient.invalidateQueries({ queryKey: ["blog-article"] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_articles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
    },
  });
}

// Helper to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
}
