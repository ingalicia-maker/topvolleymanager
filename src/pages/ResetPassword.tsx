import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { resetRateLimit } from '@/lib/security';
import { useTranslation } from 'react-i18next';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // Listen for PASSWORD_RECOVERY event fired by supabase-js after it
    // auto-detects tokens in the URL. This is the only signal we trust.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        if (timeout) clearTimeout(timeout);
        setSessionReady(true);
      }
    });

    const bootstrap = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // Case 1: PKCE flow — ?code=... in query string
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setSessionError(error.message || t('auth.invalidOrExpiredLink'));
            return;
          }
          // Clean the URL so refreshes don't retry the code
          window.history.replaceState({}, '', window.location.pathname);
          setSessionReady(true);
          return;
        }

        // Case 2: Implicit flow — #access_token=...&type=recovery
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const type = hash.get('type');
        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (error) {
            setSessionError(error.message || t('auth.invalidOrExpiredLink'));
            return;
          }
          window.history.replaceState({}, '', window.location.pathname);
          setSessionReady(true);
          return;
        }

        // Case 3: Error returned by Supabase (?error=... or #error=...)
        const errorDesc =
          url.searchParams.get('error_description') ||
          hash.get('error_description') ||
          url.searchParams.get('error') ||
          hash.get('error');
        if (errorDesc) {
          setSessionError(decodeURIComponent(errorDesc));
          return;
        }

        // Case 4: Wait briefly for the auth listener to fire PASSWORD_RECOVERY
        timeout = setTimeout(() => {
          if (!cancelled) setSessionError(t('auth.invalidOrExpiredLink'));
        }, 6000);
      } catch (err) {
        if (!cancelled) setSessionError(t('auth.invalidOrExpiredLink'));
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const validateInputs = () => {
    const newErrors: typeof errors = {};

    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = t('auth.minCharacters');
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    resetRateLimit('auth_signin');
    toast.success(t('auth.passwordUpdatedToast'));

    // Sign out so the user must log in with the new password
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/auth?passwordReset=success');
    }, 2000);

    setLoading(false);
  };

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{t('auth.invalidOrExpiredLink')}</CardTitle>
            <CardDescription className="text-base">
              {sessionError || t('auth.invalidResetLinkDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              {t('auth.requestNewRecovery')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">{t('auth.verifyingRecoveryLink')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">{t('auth.passwordUpdatedTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('auth.passwordUpdatedDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('auth.newPassword')}</CardTitle>
          <CardDescription>
            {t('auth.enterNewPassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.minCharacters')}
                disabled={loading}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('auth.repeatPassword')}
                disabled={loading}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('auth.passwordMinLengthNote')}
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.updating') : t('auth.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
