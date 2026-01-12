import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function useSignedUrl(photoUrl: string | null | undefined, bucket: string = 'player-photos') {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null);
      return;
    }

    // Extract file path from URL
    const getFilePath = (url: string): string | null => {
      try {
        // Handle full URLs
        if (url.includes('/storage/v1/object/public/')) {
          const parts = url.split(`/storage/v1/object/public/${bucket}/`);
          return parts[1] || null;
        }
        // Handle direct file paths
        if (!url.startsWith('http')) {
          return url;
        }
        // Try to extract from any storage URL format
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split(`/${bucket}/`);
        return pathParts[1] || null;
      } catch {
        return url; // Assume it's already a file path
      }
    };

    const filePath = getFilePath(photoUrl);
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    const cacheKey = `${bucket}:${filePath}`;
    const cached = urlCache.get(cacheKey);
    const now = Date.now();

    // Use cached URL if still valid (with 5 min buffer)
    if (cached && cached.expiresAt > now + 300000) {
      setSignedUrl(cached.url);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

        if (error) {
          console.error('Error creating signed URL:', error);
          setSignedUrl(null);
        } else if (data?.signedUrl) {
          // Cache the signed URL
          urlCache.set(cacheKey, {
            url: data.signedUrl,
            expiresAt: now + (SIGNED_URL_EXPIRY * 1000),
          });
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [photoUrl, bucket]);

  return { signedUrl, loading };
}

// Utility function to get signed URL directly (for non-hook usage)
export async function getSignedUrl(
  photoUrl: string | null | undefined, 
  bucket: string = 'player-photos'
): Promise<string | null> {
  if (!photoUrl) return null;

  try {
    // Extract file path
    let filePath = photoUrl;
    if (photoUrl.includes('/storage/v1/object/public/')) {
      const parts = photoUrl.split(`/storage/v1/object/public/${bucket}/`);
      filePath = parts[1] || photoUrl;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error('Error in getSignedUrl:', err);
    return null;
  }
}
