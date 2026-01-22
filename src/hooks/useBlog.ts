import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category_id: string | null;
  category?: BlogCategory;
  tags: string[] | null;
  featured_image: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

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

// Note: These tables are new and not yet in the generated types
// Using raw SQL queries until types are regenerated

export function useBlogCategories() {
  return useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories" as unknown as "clubs")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data as unknown) as BlogCategory[];
    },
  });
}

export function useBlogArticles(options?: { publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["blog-articles", options?.publishedOnly],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles" as unknown as "clubs")
        .select(`
          *,
          category:category_id(*)
        `)
        .order("created_at", { ascending: false });

      if (options?.publishedOnly) {
        query = query.eq("is_published" as never, true as never);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map category relation
      const articles = (data as unknown as Array<Record<string, unknown>>)?.map((item) => ({
        ...item,
        category: item.category as BlogCategory | null,
      }));
      
      return articles as BlogArticle[];
    },
  });
}

export function useBlogArticle(slug: string) {
  return useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles" as unknown as "clubs")
        .select(`
          *,
          category:category_id(*)
        `)
        .eq("slug" as never, slug as never)
        .single();

      if (error) throw error;
      
      const article = data as unknown as Record<string, unknown>;
      return {
        ...article,
        category: article.category as BlogCategory | null,
      } as BlogArticle;
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
        .from("blog_articles" as unknown as "clubs")
        .insert({
          ...data,
          author_id: user.user?.id,
          published_at: data.is_published ? new Date().toISOString() : null,
        } as never)
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
          .from("blog_articles" as unknown as "clubs")
          .select("published_at")
          .eq("id" as never, id as never)
          .single();
        
        const existingArticle = existing as unknown as { published_at?: string } | null;
        if (!existingArticle?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data: article, error } = await supabase
        .from("blog_articles" as unknown as "clubs")
        .update(updateData as never)
        .eq("id" as never, id as never)
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
        .from("blog_articles" as unknown as "clubs")
        .delete()
        .eq("id" as never, id as never);

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
