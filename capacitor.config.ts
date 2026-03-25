import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.topvolleymanager',
  appName: 'Top Volley Manager',
  webDir: 'dist',
  server: {
    url: 'https://96100d7a-9317-4bb4-8e13-8cdf53f46b73.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
