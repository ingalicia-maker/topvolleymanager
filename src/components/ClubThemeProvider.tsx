import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClubTheme {
  clubName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string | null;
}

const defaultTheme: ClubTheme = {
  clubName: 'Voleibol Manager',
  primaryColor: '221 83% 53%',
  accentColor: '25 95% 53%',
  fontFamily: 'Inter',
  logoUrl: null,
};

const ClubThemeContext = createContext<ClubTheme>(defaultTheme);

export const useClubTheme = () => useContext(ClubThemeContext);

const FONT_URLS: Record<string, string> = {
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  'Lato': 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
};

export function ClubThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ClubTheme>(defaultTheme);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('club_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setTheme({
          clubName: data.club_name,
          primaryColor: data.primary_color,
          accentColor: data.accent_color,
          fontFamily: data.font_family,
          logoUrl: data.logo_url,
        });
      }
    };

    fetchSettings();
  }, []);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--accent', theme.accentColor);
    root.style.setProperty('--ring', theme.primaryColor);
    
    // Set font
    root.style.setProperty('--font-sans', `"${theme.fontFamily}", sans-serif`);
    document.body.style.fontFamily = `"${theme.fontFamily}", sans-serif`;

    // Load font
    const fontUrl = FONT_URLS[theme.fontFamily];
    if (fontUrl) {
      const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
      }
    }
  }, [theme]);

  return (
    <ClubThemeContext.Provider value={theme}>
      {children}
    </ClubThemeContext.Provider>
  );
}
