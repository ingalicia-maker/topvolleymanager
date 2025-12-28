import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'coach' | 'director';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  assigned_teams: string[];
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

    const fetchRoleAndProfile = async () => {
      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      setLoading(false);
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
