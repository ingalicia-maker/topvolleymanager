import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  icon: string | null;
  is_published: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function usePublishedResources() {
  return useQuery({
    queryKey: ['published-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (resource: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'download_count'>) => {
      const { data, error } = await supabase
        .from('resources')
        .insert(resource)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['published-resources'] });
      toast.success('Recurso creado correctamente');
    },
    onError: (error) => {
      console.error('Error creating resource:', error);
      toast.error('Error al crear el recurso');
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Resource> & { id: string }) => {
      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['published-resources'] });
      toast.success('Recurso actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating resource:', error);
      toast.error('Error al actualizar el recurso');
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First get the resource to delete the file
      const { data: resource } = await supabase
        .from('resources')
        .select('file_path')
        .eq('id', id)
        .single();
      
      if (resource?.file_path) {
        await supabase.storage
          .from('resources')
          .remove([resource.file_path]);
      }
      
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['published-resources'] });
      toast.success('Recurso eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting resource:', error);
      toast.error('Error al eliminar el recurso');
    },
  });
}

export function useIncrementDownload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current } = await supabase
        .from('resources')
        .select('download_count')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('resources')
        .update({ download_count: (current?.download_count || 0) + 1 })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['published-resources'] });
    },
  });
}

export async function uploadResourceFile(file: File): Promise<{ path: string; url: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(fileName, file);
  
  if (uploadError) throw uploadError;
  
  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(fileName);
  
  return { path: fileName, url: publicUrl };
}

export function getResourcePublicUrl(filePath: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(filePath);
  return publicUrl;
}
