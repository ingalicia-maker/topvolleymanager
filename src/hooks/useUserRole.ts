import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'coach' | 'director';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  assigned_teams: string[];
  responsibility_code_accepted_at: string | null;
  terms_accepted_at: string | null;
}

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Important: when auth session is restoring, `user` can go from null -> user.
    // We must set loading back to true, otherwise pages that redirect based on roles
    // (e.g. CoachManagement) can redirect prematurely.
    setLoading(true);

    const fetchRoleAndProfile = async () => {
      try {
        // Fetch roles from user_roles table
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        // Also check club_members for role (primary source of truth)
        const { data: memberData } = await supabase
          .from('club_members')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Combine roles from both sources
        const rolesFromUserRoles = rolesData?.map(r => r.role as AppRole) || [];
        const roleFromClubMember = memberData?.role as AppRole | undefined;

        // Use club_members role as priority, then merge with user_roles
        const combinedRoles = new Set<AppRole>(rolesFromUserRoles);
        if (roleFromClubMember) {
          combinedRoles.add(roleFromClubMember);
        }

        setRoles(Array.from(combinedRoles));

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData as UserProfile);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAndProfile();
  }, [user]);

  const isDirector = roles.includes('director');
  const isCoach = roles.includes('coach') || !isDirector; // Default to coach if no role

  // Teams the user can manage (their assigned teams, or all if director)
  const assignedTeams = profile?.assigned_teams || [];

  const canManageTeam = (teamId: string) => {
    if (isDirector) return true;
    return assignedTeams.includes(teamId);
  };

  const updateAssignedTeams = async (newTeams: string[]) => {
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ assigned_teams: newTeams })
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, assigned_teams: newTeams } : null);
      return true;
    }
    return false;
  };

  return {
    roles,
    profile,
    loading,
    isDirector,
    isCoach,
    assignedTeams,
    canManageTeam,
    updateAssignedTeams,
  };
}
