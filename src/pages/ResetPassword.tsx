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

const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSessionReady(true);
      } else {
        // Wait for auth state change from recovery link
        const timeout = setTimeout(() => {
          setSessionError(true);
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            clearTimeout(timeout);
            setSessionReady(true);
          }
        });

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      }
    };

    checkSession();
  }, []);

  const validateInputs = () => {
    const newErrors: typeof errors = {};
    
    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
    toast.success('Contraseña actualizada correctamente');
    
    // Redirect after a short delay
    setTimeout(() => {
      navigate('/');
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
            <CardTitle className="text-2xl">Enlace inválido o expirado</CardTitle>
            <CardDescription className="text-base">
              El enlace de recuperación de contraseña no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Volver a solicitar recuperación
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
              <p className="text-muted-foreground">Verificando enlace de recuperación...</p>
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
            <CardTitle className="text-2xl">¡Contraseña actualizada!</CardTitle>
            <CardDescription className="text-base">
              Tu contraseña ha sido cambiada correctamente. Redirigiendo...
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
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            Introduce tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar contraseña</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                disabled={loading}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu nueva contraseña debe tener al menos 6 caracteres.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
