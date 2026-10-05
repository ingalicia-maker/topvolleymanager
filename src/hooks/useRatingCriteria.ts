import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from './useClub';
import { tr } from '@/lib/tr';
import { buildCriteria, type BuiltinKey, type Criterion, type CriterionRow } from '@/lib/ratingCriteria';

// rating_criteria is newer than the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('rating_criteria');

/** The rating criteria of the current club: `criteria` (active, in order) and `all` (incl. hidden). */
export function useRatingCriteria() {
  const { club } = useClub();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const clubId = club?.id;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['rating-criteria', clubId],
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CriterionRow[]> => {
      const { data, error } = await table().select('*').eq('club_id', clubId).order('position');
      if (error) {
        // Table not created yet: the five original criteria are used.
        console.warn('rating_criteria unavailable:', error.message);
        return [];
      }
      return data ?? [];
    },
  });

  // Labels depend on the interface language.
  const all = useMemo(() => buildCriteria(rows), [rows, i18n.resolvedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps
  const criteria = useMemo(() => all.filter((c) => c.active), [all]);

  /** Saves the club's list (order, visibility, names, new criteria). Directors only (RLS). */
  const saveCriteria = async (list: Array<Pick<Criterion, 'id' | 'builtinKey' | 'label' | 'active'> & { renamed?: string | null }>) => {
    if (!clubId) return false;
    try {
      for (const [position, c] of list.entries()) {
        const row = {
          club_id: clubId,
          builtin_key: c.builtinKey as BuiltinKey | null,
          label: c.builtinKey ? (c.renamed?.trim() || null) : c.label.trim(),
          position,
          is_active: c.active,
        };
        const { error } = c.id
          ? await table().update(row).eq('id', c.id)
          : await table().insert(row);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['rating-criteria', clubId] });
      toast.success(tr('Criterios de valoración guardados'));
      return true;
    } catch (e) {
      console.error('Error saving rating criteria:', e);
      toast.error(tr('No se han podido guardar los criterios'));
      return false;
    }
  };

  return { criteria, all, loading: isLoading, saveCriteria };
}
