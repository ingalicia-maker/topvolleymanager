import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type State = 'verifying' | 'success' | 'error';

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    let cancelled = false;

    const finish = (target: string) => {
      if (cancelled) return;
      setState('success');
      setTimeout(() => navigate(target, { replace: true }), 800);
    };

    const run = async () => {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      );

      // 0) Explicit error from the auth server
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');
      const errorCode = searchParams.get('error') || hashParams.get('error');
      if (errorCode || errorDescription) {
        setState('error');
        setMessage(
          errorDescription?.includes('expired')
            ? 'El enlace ha caducado. Solicita uno nuevo desde la pantalla de acceso.'
            : errorDescription || 'El enlace de verificación no es válido.'
        );
        return;
      }

      // 1) token_hash flow (works on any device / email client)
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
      const type = (searchParams.get('type') || 'signup') as
        | 'signup'
        | 'magiclink'
        | 'recovery'
        | 'invite'
        | 'email_change';
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setState('error');
          setMessage(
            error.message.toLowerCase().includes('expired')
              ? 'El enlace ha caducado. Solicita uno nuevo desde la pantalla de acceso.'
              : 'No hemos podido verificar tu email. El enlace puede haber sido usado ya.'
          );
          return;
        }
        finish(type === 'recovery' ? '/reset-password' : redirectTo);
        return;
      }

      // 2) PKCE code flow
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setState('error');
          setMessage('No hemos podido completar la verificación. Vuelve a iniciar sesión.');
          return;
        }
        finish(redirectTo);
        return;
      }

      // 3) Implicit flow (tokens in the hash)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setState('error');
          setMessage('No hemos podido iniciar tu sesión. Vuelve a iniciar sesión.');
          return;
        }
        finish(redirectTo);
        return;
      }

      // 4) Already logged in?
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish(redirectTo);
        return;
      }

      setState('error');
      setMessage('Enlace de verificación incompleto o ya utilizado.');
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {state === 'verifying' && <Loader2 className="h-5 w-5 animate-spin" />}
            {state === 'success' && <CheckCircle2 className="h-5 w-5 text-primary" />}
            {state === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
            {state === 'verifying' && 'Verificando tu email...'}
            {state === 'success' && '¡Email verificado!'}
            {state === 'error' && 'No se pudo verificar'}
          </CardTitle>
          <CardDescription>
            {state === 'verifying' && 'Un momento, estamos confirmando tu cuenta.'}
            {state === 'success' && 'Te estamos redirigiendo a la aplicación.'}
            {state === 'error' && message}
          </CardDescription>
        </CardHeader>
        {state === 'error' && (
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth', { replace: true })}>Ir a iniciar sesión</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
