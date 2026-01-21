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
  responsible_person_name: string | null;
  responsible_person_email: string | null;
  terms_and_conditions: string | null;
  responsibility_code: string | null;
  terms_updated_at: string | null;
  responsibility_code_updated_at: string | null;
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
  short_code: string | null;
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

  // Allow other parts of the app (e.g., invitation acceptance) to force a refresh
  useEffect(() => {
    const handler = () => {
      fetchClub();
    };
    window.addEventListener('club-membership-changed', handler);
    return () => window.removeEventListener('club-membership-changed', handler);
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

      // Notify admin of new director registration (fire-and-forget)
      if (role === 'director') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .maybeSingle();

        supabase.functions.invoke('notify-new-director', {
          body: {
            directorName: profile?.name || user.email || 'Desconocido',
            directorEmail: profile?.email || user.email || '',
            clubName: name,
            userId: user.id,
          },
        }).catch(err => console.error('Error notifying admin:', err));
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

    // Extract token from URL if needed
    // Supports:
    //   - Raw token: "abc123"
    //   - Old format: "https://...?invite=TOKEN"
    //   - Short format (may 404 depending on hosting rewrites): "https://.../inv/TOKEN"
    //   - Hash format (always works without rewrites): "https://.../invitation#TOKEN" or ".../invitation#invite=TOKEN"
    let token = rawTokenOrUrl.trim();
    try {
      const url = new URL(token);

      const inviteParam = url.searchParams.get('invite');
      if (inviteParam) {
        token = inviteParam;
      } else if (url.hash) {
        const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        if (rawHash.includes('invite=')) {
          const params = new URLSearchParams(rawHash);
          const hashInvite = params.get('invite');
          if (hashInvite) token = hashInvite;
        } else if (rawHash) {
          token = rawHash;
        }
      } else {
        const pathMatch = url.pathname.match(/\/inv\/([^/]+)$/);
        if (pathMatch && pathMatch[1]) {
          token = pathMatch[1];
        }
      }
    } catch {
      // Not a URL, use as-is (raw token)
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

      // Join the club with the role from the invitation
      const memberRole = invitation.role as 'coach' | 'director';
      const { error: joinError } = await supabase
        .from('club_members')
        .insert({
          club_id: invitation.club_id,
          user_id: user.id,
          role: memberRole,
        });

      if (joinError) throw joinError;

      // Also add to user_roles table for permission checks
      // First check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', memberRole)
        .maybeSingle();

      if (!existingRole) {
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: memberRole });
      }

      // Mark invitation as used
      await supabase
        .from('club_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      // Notify all directors that a new member joined
      const { data: directors } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', invitation.club_id)
        .eq('role', 'director');

      // Get the new user's profile name
      const { data: newUserProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      const newMemberName = newUserProfile?.name || user.email || 'Nuevo miembro';

      // Create notifications for all directors
      if (directors && directors.length > 0) {
        const notifications = directors
          .filter(d => d.user_id !== user.id) // Don't notify themselves
          .map(director => ({
            recipient_id: director.user_id,
            sender_id: user.id,
            type: 'new_member_joined',
            title: 'Nuevo miembro en el club',
            message: `${newMemberName} se ha unido al club como ${invitation.role === 'director' ? 'Director Deportivo' : 'Entrenador'}`,
            is_read: false,
          }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      await fetchClub();
      return { success: true };
    } catch (error: any) {
      console.error('Error joining club:', error);
      return { success: false, error: error.message || 'Error al unirse al club' };
    }
  };

  const createInvitation = async (
    role: 'coach' | 'director' = 'coach',
    email?: string,
    notifyDirectors: boolean = false
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

      // If a coach created the invitation, notify all directors
      if (notifyDirectors) {
        const { data: directors } = await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', club.id)
          .eq('role', 'director');

        // Get creator's profile name
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();

        const creatorName = creatorProfile?.name || 'Un entrenador';

        if (directors && directors.length > 0) {
          const notifications = directors.map(director => ({
            recipient_id: director.user_id,
            sender_id: user.id,
            type: 'coach_created_invitation',
            title: 'Invitación creada',
            message: `${creatorName} ha creado una invitación para un nuevo entrenador`,
            is_read: false,
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

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
