import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import { User, Shield, CheckCircle2, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [alsoCoach, setAlsoCoach] = useState(false);
  const [directorDeclarationAccepted, setDirectorDeclarationAccepted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; name?: string }>({}); 
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  const validateInputs = (isSignUp: boolean) => {
    const newErrors: typeof errors = {};
    
    try {
      emailSchema.parse(email);
    } catch {
      newErrors.email = 'Email inválido';
    }

    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    if (isSignUp) {
      if (!name.trim()) {
        newErrors.name = 'El nombre es obligatorio';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email o contraseña incorrectos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Email no confirmado. Revisa tu bandeja de entrada.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('¡Bienvenido!');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      setErrors({ email: 'Email inválido' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setResetEmailSent(true);
      toast.success('Email de recuperación enviado');
    }
    setLoading(false);
  };

  const notifyDirectorsAboutNewCoach = async (coachName: string, coachEmail: string) => {
    try {
      await supabase.functions.invoke('notify-new-coach', {
        body: { coachName, coachEmail }
      });
    } catch (error) {
      console.error('Error notifying directors:', error);
    }
  };

  const sendVerificationEmail = async (userEmail: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: { 
          email: userEmail, 
          name: userName,
          language: i18n.language || 'es'
        }
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t('auth.invalidCode', 'Código inválido'));
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email: email.trim(), code: verificationCode }
      });

      if (error || !data?.success) {
        toast.error(t('auth.codeExpiredOrInvalid', 'Código expirado o inválido'));
        setVerifying(false);
        return;
      }

      toast.success(t('auth.accountVerified', '¡Cuenta verificada correctamente!'));
      localStorage.setItem('is_new_director', 'true');
      
      // Wait for auth state to update and let onAuthStateChange handle navigation
      setShowEmailConfirmation(false);
      
      // Try to sign in after verification
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error(t('auth.verificationError', 'Error al verificar el código'));
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    const success = await sendVerificationEmail(email.trim(), name.trim());
    if (success) {
      toast.success(t('auth.emailResent', 'Email reenviado'));
    } else {
      toast.error(t('auth.emailResendError', 'Error al reenviar el email'));
    }
    setResendingEmail(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    // Director must accept declaration
    if (!directorDeclarationAccepted) {
      toast.error('Debes aceptar la declaración de autenticidad para registrarte como Director Deportivo');
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name.trim(),
          is_director: true,
          is_also_coach: alsoCoach,
          assigned_teams: [],
          director_declaration_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    // Send custom verification email
    if (data.user && !data.session) {
      const emailSent = await sendVerificationEmail(email.trim(), name.trim());
      if (emailSent) {
        setShowEmailConfirmation(true);
        localStorage.setItem('is_new_director', 'true');
      } else {
        toast.error(t('auth.emailSendError', 'Error al enviar el email de verificación'));
      }
    } else if (data.session) {
      // Auto-confirmed, redirect will happen via onAuthStateChange
      localStorage.setItem('is_new_director', 'true');
      toast.success('¡Cuenta creada correctamente!');
    }

    setLoading(false);
  };


  // Show password reset form
  if (showPasswordReset) {
    if (resetEmailSent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Revisa tu email</CardTitle>
              <CardDescription className="text-base">
                Te hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Haz clic en el enlace del email para crear una nueva contraseña. 
                  Si no lo ves, revisa tu carpeta de spam.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowPasswordReset(false);
                  setResetEmailSent(false);
                  setEmail('');
                }}
              >
                Volver al inicio de sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
            <CardDescription>
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={loading}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowPasswordReset(false);
                  setErrors({});
                }}
              >
                Volver al inicio de sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show email confirmation screen for directors with OTP input
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('auth.confirmEmail', 'Confirma tu email')}</CardTitle>
            <CardDescription className="text-base">
              {t('auth.verificationCodeSent', 'Te hemos enviado un código de verificación a')} <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Label className="text-sm text-muted-foreground">
                {t('auth.enterCode', 'Introduce el código de 6 dígitos')}
              </Label>
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={verifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              className="w-full" 
              onClick={handleVerifyCode}
              disabled={verifying || verificationCode.length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('auth.verifying', 'Verificando...')}
                </>
              ) : (
                t('auth.verifyCode', 'Verificar código')
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('auth.noCodeReceived', '¿No recibiste el código?')}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleResendEmail}
                disabled={resendingEmail}
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('auth.resending', 'Reenviando...')}
                  </>
                ) : (
                  t('auth.resendCode', 'Reenviar código')
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowEmailConfirmation(false);
                  setVerificationCode('');
                }}
              >
                {t('auth.backToLogin', 'Volver al inicio')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Top Volley Manager</CardTitle>
          <CardDescription>{t('auth.manageTeams', 'Gestiona tus equipos y convocatorias')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">{t('auth.login', 'Iniciar Sesión')}</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">{t('auth.register', 'Registrarse')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordReset(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Cargando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre *</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    disabled={loading}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email *</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña *</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmar contraseña *</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    disabled={loading}
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>

                {/* Director registration info */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Registro como Director Deportivo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Acceso total a todos los equipos, configuración del club y gestión de entrenadores
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Debes registrarte como Director Deportivo para crear tu club por primera vez. Luego, podrás añadir equipos y entrenadores de tu club o simplemente gestionar tu propio equipo.
                      </p>
                    </div>
                  </div>
                  
                  {/* Also coach option */}
                  <div className="flex items-start space-x-3 pt-2 border-t border-amber-500/20">
                    <Checkbox
                      id="also-coach"
                      checked={alsoCoach}
                      onCheckedChange={(checked) => setAlsoCoach(checked === true)}
                    />
                    <label
                      htmlFor="also-coach"
                      className="text-xs text-muted-foreground cursor-pointer leading-relaxed flex items-center gap-2"
                    >
                      <User className="w-3 h-3" />
                      También seré entrenador de algún equipo
                    </label>
                  </div>
                  
                  {/* Director declaration */}
                  <div className="pt-2 border-t border-amber-500/20 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="director-declaration"
                        checked={directorDeclarationAccepted}
                        onCheckedChange={(checked) => setDirectorDeclarationAccepted(checked === true)}
                      />
                      <label
                        htmlFor="director-declaration"
                        className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                      >
                        Declaro la autenticidad de mis datos y confirmo que actúo como Director Deportivo del club que voy a representar en esta aplicación *
                      </label>
                    </div>
                    
                    {directorDeclarationAccepted && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Declaración aceptada</span>
                      </div>
                    )}
                    
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                      <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Se te enviará un email de confirmación para verificar tu identidad
                      </span>
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !directorDeclarationAccepted}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta como Director'}
                </Button>
                
                {!directorDeclarationAccepted && (
                  <p className="text-xs text-center text-muted-foreground">
                    Acepta la declaración de autenticidad para continuar
                  </p>
                )}
                
                <p className="text-xs text-center text-muted-foreground border-t pt-4 mt-2">
                  ¿Eres entrenador y tu club ya está registrado? Solicita un enlace de invitación a tu Director Deportivo.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
