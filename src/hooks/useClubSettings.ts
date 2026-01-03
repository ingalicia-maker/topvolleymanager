import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClubSettings {
  id: string;
  club_name: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
  logo_url: string | null;
}

const DEFAULT_SETTINGS: ClubSettings = {
  id: '',
  club_name: 'Mi Club de Voleibol',
  primary_color: '221 83% 53%',
  accent_color: '25 95% 53%',
  font_family: 'Inter',
  logo_url: null,
};

export function useClubSettings() {
  const [settings, setSettings] = useState<ClubSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('club_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setSettings(data as ClubSettings);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<ClubSettings>) => {
    const { error } = await supabase
      .from('club_settings')
      .update(newSettings)
      .eq('id', settings.id);

    if (!error) {
      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    }
    return false;
  };

  const uploadLogo = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) return null;

    const { data: urlData } = supabase.storage
      .from('club-logos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  return {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
}
