import type { User } from '@supabase/supabase-js';

/**
 * Detecta de forma fiable si un signUp ha devuelto un usuario YA existente.
 *
 * Supabase oculta las identidades en algunos casos también para usuarios nuevos,
 * por lo que `identities.length === 0` por sí solo produce falsos positivos.
 * Solo consideramos "ya registrado" si además hay señales claras:
 *  - el email ya está confirmado, o
 *  - el usuario fue creado hace bastante tiempo (no en esta petición).
 */
export function isExistingUserSignUp(user: User | null | undefined): boolean {
  if (!user) return false;

  if (user.email_confirmed_at || (user as any).confirmed_at) return true;

  if (user.created_at) {
    const createdMs = new Date(user.created_at).getTime();
    if (!Number.isNaN(createdMs) && Date.now() - createdMs > 60_000) return true;
  }

  if (user.last_sign_in_at) return true;

  return false;
}
