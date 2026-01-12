import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  created_at: string;
  updated_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'coach' | 'director';
  joined_at: string;
}

export interface ClubInvitation {
  id: string;
  club_id: string;
  token: string;
  role: string;
  email: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export function useClub() {
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [membership, setMembership] = useState<ClubMember | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [invitations, setInvitations] = useState<ClubInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasClub, setHasClub] = useState<boolean | null>(null);

  const fetchClub = async () => {
    if (!user) {
      setLoading(false);
      setHasClub(null);
      return;
    }

    try {
      // First check if user has a club membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('club_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membershipData) {
        setHasClub(false);
        setLoading(false);
        return;
      }

      setMembership(membershipData as ClubMember);
      setHasClub(true);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', membershipData.club_id)
        .single();

      if (clubError) throw clubError;
      setClub(clubData as Club);

      // Fetch all members
      const { data: membersData } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', membershipData.club_id);

      setMembers((membersData || []) as ClubMember[]);

      // Fetch all invitations (including used/expired for history)
      const { data: invitationsData } = await supabase
        .from('club_invitations')
        .select('*')
        .eq('club_id', membershipData.club_id)
        .order('created_at', { ascending: false });

      setInvitations((invitationsData || []) as ClubInvitation[]);
    } catch (error) {
      console.error('Error fetching club:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClub();
  }, [user]);

  const createClub = async (name: string, role: 'coach' | 'director' = 'director'): Promise<{ club: Club | null; error: string | null }> => {
    if (!user) return { club: null, error: 'Usuario no autenticado' };

    try {
      // Create the club
      const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name,
          created_by: user.id,
        })
        .select()
        .single();

      if (clubError) {
        console.error('Error creating club:', clubError);
        return { club: null, error: clubError.message };
      }

      // Add user as member with specified role
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: newClub.id,
          user_id: user.id,
          role,
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        // Try to delete the club if member creation failed
        await supabase.from('clubs').delete().eq('id', newClub.id);
        return { club: null, error: memberError.message };
      }

      await fetchClub();
      return { club: newClub as Club, error: null };
    } catch (error: any) {
      console.error('Error creating club:', error);
      return { club: null, error: error.message || 'Error desconocido' };
    }
  };

  const joinClubWithToken = async (rawTokenOrUrl: string) => {
    if (!user) return { success: false, error: 'No autenticado' };

    // Extract token from URL if needed (e.g., https://...?invite=TOKEN)
    let token = rawTokenOrUrl.trim();
    try {
      const url = new URL(token);
      const inviteParam = url.searchParams.get('invite');
      if (inviteParam) {
        token = inviteParam;
      }
    } catch {
      // Not a URL, use as-is
    }
    try {
      // Find the invitation
      const { data: invitation, error: invError } = await supabase
        .from('club_invitations')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .maybeSingle();

      if (invError) throw invError;
      if (!invitation) {
        return { success: false, error: 'Invitación no válida o expirada' };
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        return { success: false, error: 'La invitación ha expirado' };
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', invitation.club_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        return { success: false, error: 'Ya eres miembro de este club' };
      }

      // Join the club
      const { error: joinError } = await supabase
        .from('club_members')
        .insert({
          club_id: invitation.club_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (joinError) throw joinError;

      // Mark invitation as used
      await supabase
        .from('club_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      await fetchClub();
      return { success: true };
    } catch (error: any) {
      console.error('Error joining club:', error);
      return { success: false, error: error.message || 'Error al unirse al club' };
    }
  };

  const createInvitation = async (
    role: 'coach' | 'director' = 'coach',
    email?: string
  ): Promise<{ invitation: ClubInvitation | null; error: string | null }> => {
    if (!user) return { invitation: null, error: 'Usuario no autenticado' };
    if (!club) return { invitation: null, error: 'Club no cargado' };

    try {
      const { data, error } = await supabase
        .from('club_invitations')
        .insert({
          club_id: club.id,
          role,
          email: email || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setInvitations((prev) => [...prev, data as ClubInvitation]);
      return { invitation: data as ClubInvitation, error: null };
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      return { invitation: null, error: error?.message || 'Error al crear la invitación' };
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('club_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      return true;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      return false;
    }
  };

  const updateClub = async (updates: Partial<Club>) => {
    if (!club) return false;

    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', club.id);

      if (error) throw error;

      setClub(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating club:', error);
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'coach' | 'director') => {
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      return true;
    } catch (error) {
      console.error('Error updating member role:', error);
      return false;
    }
  };

  const isDirector = membership?.role === 'director';
  const isCoach = membership?.role === 'coach';

  return {
    club,
    membership,
    members,
    invitations,
    loading,
    hasClub,
    isDirector,
    isCoach,
    createClub,
    joinClubWithToken,
    createInvitation,
    deleteInvitation,
    updateClub,
    removeMember,
    updateMemberRole,
    refetch: fetchClub,
  };
}
