import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { User, Shield, CheckCircle2, Mail, AlertCircle, Loader2, Users, Ticket } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';
import { triggerCoachWelcome } from '@/components/CoachWelcomeDialog';
import { InvitationRegistrationForm } from '@/components/InvitationRegistrationForm';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [alsoCoach, setAlsoCoach] = useState(false);
  const [directorDeclarationAccepted, setDirectorDeclarationAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; name?: string }>({});
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Short code invitation state
  const [invitationCode, setInvitationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifiedClub, setVerifiedClub] = useState<{ club_id: string; club_name: string; responsibility_code?: string } | null>(null);
  
  // Registration mode: 'select' | 'director' | 'coach'
  const [registrationMode, setRegistrationMode] = useState<'select' | 'director' | 'coach'>('select');
  const [responsibilityCodeAccepted, setResponsibilityCodeAccepted] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';

  // Extract invitation token from various URL formats
  const extractInviteToken = (value: string): string | null => {
    try {
      // Absolute URL
      const url = new URL(value, window.location.origin);
      const qp = url.searchParams.get('invite');
      if (qp) return qp;

      if (url.hash) {
        const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        if (rawHash.includes('invite=')) {
          const params = new URLSearchParams(rawHash);
          const h = params.get('invite');
          if (h) return h;
        }
        if (rawHash && rawHash.length > 10) return rawHash;
      }

      const m = url.pathname.match(/\/inv\/([^/?#]+)/);
      return m?.[1] || null;
    } catch {
      // Relative path
      const qpMatch = value.match(/[?&]invite=([^&#]+)/);
      if (qpMatch?.[1]) return decodeURIComponent(qpMatch[1]);

      const hash = value.split('#')[1];
      if (hash) {
        if (hash.includes('invite=')) {
          const params = new URLSearchParams(hash);
          const h = params.get('invite');
          if (h) return h;
        }
        if (hash.length > 10) return hash;
      }

      const m = value.match(/\/inv\/([^/?#]+)/);
      return m?.[1] || null;
    }
  };

  const inviteToken = extractInviteToken(redirectTo);
  const isInvitationFlow = !!inviteToken;

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1) If user is already logged in and comes from invitation token, try to accept it
      if (isInvitationFlow && inviteToken) {
        try {
          const { error } = await supabase.rpc('accept_club_invitation', { _token: inviteToken });
          if (!error || error.message?.toLowerCase().includes('ya eres miembro')) {
            window.dispatchEvent(new Event('club-membership-changed'));
            triggerCoachWelcome();
            toast.success('¡Te has unido al club!');
            navigate('/', { replace: true });
            return;
          }
        } catch (err) {
          console.error('[Auth] Error accepting invitation for logged-in user:', err);
        }
      }

      // 2) If user just verified email after signup with short code, auto-join the club
      const pendingRole = localStorage.getItem('pending_signup_role');
      const pendingCode = localStorage.getItem('pending_invitation_code');
      if (pendingRole === 'coach' && pendingCode) {
        try {
          const { error: joinError } = await supabase.rpc('accept_club_invitation_by_code', { _code: pendingCode });
          if (!joinError || joinError.message?.toLowerCase().includes('ya eres miembro')) {
            window.dispatchEvent(new Event('club-membership-changed'));
            triggerCoachWelcome();
            toast.success('¡Te has unido al club!');
          }
        } catch (err) {
          console.error('[Auth] Error joining club after email verification:', err);
        }
        localStorage.removeItem('pending_invitation_code');
        localStorage.removeItem('pending_signup_role');
        setShowEmailConfirmation(false);
      } else if (pendingRole === 'director') {
        localStorage.setItem('is_new_director', 'true');
        localStorage.removeItem('pending_signup_role');
        setShowEmailConfirmation(false);
      }

      navigate(redirectTo, { replace: true });
    };

    checkSession();
  }, [navigate, redirectTo, isInvitationFlow, inviteToken]);

  // Listen for auth state changes (non-invitation flows only)
  useEffect(() => {
    if (isInvitationFlow) return; // Invitation flow handles its own navigation

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        void (async () => {
          const pendingRole = localStorage.getItem('pending_signup_role');
          const pendingCode = localStorage.getItem('pending_invitation_code');

          if (pendingRole === 'coach' && pendingCode) {
            try {
              const { error: joinError } = await supabase.rpc('accept_club_invitation_by_code', { _code: pendingCode });
              if (!joinError || joinError.message?.toLowerCase().includes('ya eres miembro')) {
                window.dispatchEvent(new Event('club-membership-changed'));
                triggerCoachWelcome();
                toast.success('¡Te has unido al club!');
              }
            } catch (err) {
              console.error('[Auth] Error joining club after SIGNED_IN:', err);
            }
            localStorage.removeItem('pending_invitation_code');
            localStorage.removeItem('pending_signup_role');
            setShowEmailConfirmation(false);
          } else if (pendingRole === 'director') {
            localStorage.setItem('is_new_director', 'true');
            localStorage.removeItem('pending_signup_role');
            setShowEmailConfirmation(false);
          }

          navigate(redirectTo, { replace: true });
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo, isInvitationFlow]);


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
      setLoading(false);
      return;
    }

    // If coming from an invitation link, auto-join the club
    if (isInvitationFlow && inviteToken) {
      try {
        const { error: joinError } = await supabase.rpc('accept_club_invitation', { _token: inviteToken });
        if (!joinError || joinError.message?.toLowerCase().includes('ya eres miembro')) {
          window.dispatchEvent(new Event('club-membership-changed'));
          triggerCoachWelcome();
          toast.success('¡Te has unido al club!');
          navigate('/', { replace: true });
          setLoading(false);
          return;
        }
      } catch (joinError) {
        console.error('[Auth] Error accepting invitation after sign-in:', joinError);
        toast.error('No se ha podido completar la invitación');
      }
    }
    
    // If user entered a short code and verified a club, auto-join
    if (verifiedClub && invitationCode.length === 6) {
      try {
        const { error: joinError } = await supabase.rpc('accept_club_invitation_by_code', { 
          _code: invitationCode.toUpperCase() 
        });
        if (!joinError || joinError.message?.toLowerCase().includes('ya eres miembro')) {
          window.dispatchEvent(new Event('club-membership-changed'));
          triggerCoachWelcome();
          toast.success(`¡Te has unido a ${verifiedClub.club_name}!`);
          navigate('/', { replace: true });
          setLoading(false);
          return;
        } else if (joinError) {
          console.error('[Auth] Error joining via short code:', joinError);
          toast.error('Error al unirse al club: ' + joinError.message);
        }
      } catch (joinError) {
        console.error('[Auth] Error accepting invitation via code after sign-in:', joinError);
        toast.error('No se ha podido completar la invitación');
      }
    }

    toast.success('¡Bienvenido!');
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

  const resendSignupEmail = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth?redirect=/`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resending signup email:', error);
      return false;
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    const success = await resendSignupEmail();
    if (success) {
      toast.success(t('auth.emailResent', 'Email reenviado'));
    } else {
      toast.error(t('auth.emailResendError', 'Error al reenviar el email'));
    }
    setResendingEmail(false);
  };

  // Verify short invitation code
  const handleVerifyInvitationCode = async () => {
    if (invitationCode.length !== 6) return;
    
    setVerifyingCode(true);
    try {
      const { data, error } = await supabase.rpc('get_invitation_preview_by_code', { 
        _code: invitationCode.toUpperCase() 
      });
      
      if (error || !data || data.length === 0) {
        toast.error('Código inválido o expirado');
        setVerifiedClub(null);
        setVerifyingCode(false);
        return;
      }
      
      const invitation = data[0];
      if (invitation.used_at) {
        toast.error('Este código ya ha sido utilizado');
        setVerifiedClub(null);
        setVerifyingCode(false);
        return;
      }
      
      setVerifiedClub({ 
        club_id: invitation.club_id, 
        club_name: invitation.club_name,
        responsibility_code: invitation.responsibility_code
      });
      toast.success(`¡Club encontrado: ${invitation.club_name}!`);
    } catch (err) {
      console.error('Error verifying invitation code:', err);
      toast.error('Error al verificar el código');
    }
    setVerifyingCode(false);
  };

  // Watch invitation code changes for auto-verify
  useEffect(() => {
    if (invitationCode.length === 6 && !verifiedClub) {
      handleVerifyInvitationCode();
    }
    if (invitationCode.length < 6) {
      setVerifiedClub(null);
    }
  }, [invitationCode]);

  // Sign up for coaches with invitation code
  const handleCoachSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;
    
    if (!verifiedClub) {
      toast.error('Debes verificar el código de invitación primero');
      return;
    }
    
    if (!termsAccepted) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }
    
    if (!responsibilityCodeAccepted) {
      toast.error('Debes aceptar el código de responsabilidad del club');
      return;
    }

    localStorage.setItem('pending_signup_role', 'coach');
    localStorage.setItem('pending_invitation_code', invitationCode.toUpperCase());

    setLoading(true);
    const redirectUrl = `${window.location.origin}/auth?redirect=/`;

    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name.trim(),
          is_director: false,
          assigned_teams: [],
          terms_accepted_at: new Date().toISOString(),
          responsibility_code_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado. Inicia sesión para unirte al club.');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    // If email confirmation is required, show "check your email" screen.
    if (data.user && !data.session) {
      setShowEmailConfirmation(true);
      toast.success('Te hemos enviado un email para verificar tu cuenta y acceder.');
      setLoading(false);
      return;
    }

    // If the backend auto-logged in (rare), auto-join immediately.
    if (data.session) {
      try {
        const { error: joinError } = await supabase.rpc('accept_club_invitation_by_code', {
          _code: invitationCode.toUpperCase(),
        });
        if (!joinError || joinError.message?.toLowerCase().includes('ya eres miembro')) {
          window.dispatchEvent(new Event('club-membership-changed'));
          triggerCoachWelcome();
          toast.success(`¡Te has unido a ${verifiedClub.club_name}!`);
          navigate('/', { replace: true });
        }
      } catch (joinError) {
        console.error('[Auth] Error joining club after coach signup:', joinError);
      }
    }

    setLoading(false);
  };

  // Sign up for directors
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    if (!directorDeclarationAccepted) {
      toast.error('Debes aceptar la declaración de autenticidad para registrarte como Director Deportivo');
      return;
    }
    
    if (!termsAccepted) {
      toast.error('Debes aceptar los términos y condiciones para continuar');
      return;
    }

    localStorage.setItem('pending_signup_role', 'director');

    setLoading(true);
    const redirectUrl = `${window.location.origin}/auth?redirect=/`;

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
          terms_accepted_at: new Date().toISOString(),
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

    if (data.user && !data.session) {
      setShowEmailConfirmation(true);
      toast.success('Te hemos enviado un email para verificar tu cuenta y acceder.');
      setLoading(false);
      return;
    }

    if (data.session) {
      localStorage.setItem('is_new_director', 'true');
      toast.success('¡Cuenta creada correctamente!');
    }

    setLoading(false);
  };

  // ============= RENDER =============

  // INVITATION FLOW: Show dedicated invitation registration form
  if (isInvitationFlow && inviteToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <InvitationRegistrationForm 
          inviteToken={inviteToken}
          onBackToLogin={() => navigate('/auth', { replace: true })}
        />
      </div>
    );
  }

  // Password reset form
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

  // Email confirmation screen (magic link)
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('auth.confirmEmail', 'Verifica tu email')}</CardTitle>
            <CardDescription className="text-base">
              Te hemos enviado un email a <strong>{email}</strong> con un botón de <strong>Verificar email</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Pulsa el botón del email y se abrirá la app iniciando sesión automáticamente. Si no lo ves, revisa spam.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">¿No recibiste el email?</p>
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
                  t('auth.resendEmail', 'Reenviar email')
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowEmailConfirmation(false)}
              >
                {t('auth.backToLogin', 'Volver al inicio')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STANDARD LOGIN / DIRECTOR REGISTRATION
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
              {/* Registration Mode Selector */}
              {registrationMode === 'select' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    ¿Cómo quieres registrarte?
                  </p>
                  
                  {/* Option 1: Director */}
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('director')}
                    className="w-full p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          Soy Director Deportivo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Quiero crear un nuevo club y gestionar mis equipos
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Option 2: Coach with code */}
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('coach')}
                    className="w-full p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <Ticket className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-primary">
                          Tengo un código de invitación
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Un Director me ha compartido un código para unirme a su club
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Director Registration Form */}
              {registrationMode === 'director' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRegistrationMode('select')}
                    className="mb-2 -ml-2"
                  >
                    ← Volver
                  </Button>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre completo *</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Tu nombre y apellidos"
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
                      
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="terms-acceptance"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        />
                        <label
                          htmlFor="terms-acceptance"
                          className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                        >
                          He leído y acepto los{' '}
                          <a href="/terms" target="_blank" className="text-primary underline hover:no-underline">
                            Términos y Condiciones
                          </a>{' '}
                          y la{' '}
                          <a href="/privacy" target="_blank" className="text-primary underline hover:no-underline">
                            Política de Privacidad
                          </a>{' '}
                          de la aplicación *
                        </label>
                      </div>
                      
                      {directorDeclarationAccepted && termsAccepted && (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Declaraciones aceptadas</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                        <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          {t('auth.emailConfirmationNote', 'Se te enviará un email para verificar tu identidad')}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !directorDeclarationAccepted || !termsAccepted}
                  >
                    {loading ? 'Creando cuenta...' : 'Crear cuenta de Director'}
                  </Button>
                </form>
              )}

              {/* Coach Registration with Invitation Code */}
              {registrationMode === 'coach' && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRegistrationMode('select');
                      setInvitationCode('');
                      setVerifiedClub(null);
                    }}
                    className="mb-2 -ml-2"
                  >
                    ← Volver
                  </Button>

                  {/* Step 1: Enter invitation code */}
                  {!verifiedClub && (
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <Ticket className="w-12 h-12 mx-auto text-primary" />
                        <p className="font-medium">Introduce tu código de invitación</p>
                        <p className="text-xs text-muted-foreground">
                          El código tiene 6 caracteres y te lo ha facilitado el Director de tu club
                        </p>
                      </div>
                      
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={invitationCode}
                          onChange={(value) => setInvitationCode(value.toUpperCase())}
                          disabled={verifyingCode}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="uppercase text-lg" />
                            <InputOTPSlot index={1} className="uppercase text-lg" />
                            <InputOTPSlot index={2} className="uppercase text-lg" />
                            <InputOTPSlot index={3} className="uppercase text-lg" />
                            <InputOTPSlot index={4} className="uppercase text-lg" />
                            <InputOTPSlot index={5} className="uppercase text-lg" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      
                      {verifyingCode && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verificando código...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Registration form after code verified */}
                  {verifiedClub && (
                    <form onSubmit={handleCoachSignUp} className="space-y-4">
                      <Alert className="border-green-500/50 bg-green-500/10">
                        <Users className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400">
                          <strong>¡Club encontrado!</strong>
                          <br />
                          Te unirás a: <strong>{verifiedClub.club_name}</strong>
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="coach-name">Nombre completo *</Label>
                        <Input
                          id="coach-name"
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Tu nombre y apellidos"
                          disabled={loading}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach-email">Email *</Label>
                        <Input
                          id="coach-email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          disabled={loading}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach-password">Contraseña *</Label>
                        <Input
                          id="coach-password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          disabled={loading}
                        />
                        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach-confirm-password">Confirmar contraseña *</Label>
                        <Input
                          id="coach-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repite tu contraseña"
                          disabled={loading}
                        />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                      </div>

                      {/* Terms and Responsibility Code */}
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="coach-terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          />
                          <label
                            htmlFor="coach-terms"
                            className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                          >
                            He leído y acepto los{' '}
                            <a href="/terms" target="_blank" className="text-primary underline hover:no-underline">
                              Términos y Condiciones
                            </a>{' '}
                            y la{' '}
                            <a href="/privacy" target="_blank" className="text-primary underline hover:no-underline">
                              Política de Privacidad
                            </a>{' '}
                            de la aplicación *
                          </label>
                        </div>
                        
                        <div className="flex items-start space-x-3 pt-2 border-t border-primary/20">
                          <Checkbox
                            id="responsibility-code"
                            checked={responsibilityCodeAccepted}
                            onCheckedChange={(checked) => setResponsibilityCodeAccepted(checked === true)}
                          />
                          <label
                            htmlFor="responsibility-code"
                            className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                          >
                            He leído y acepto el{' '}
                            <button
                              type="button"
                              onClick={() => {
                                if (verifiedClub?.responsibility_code) {
                                  toast.info(verifiedClub.responsibility_code, { duration: 10000 });
                                } else {
                                  toast.info('Código de responsabilidad estándar del club');
                                }
                              }}
                              className="text-primary underline hover:no-underline"
                            >
                              Código de Responsabilidad
                            </button>{' '}
                            del club *
                          </label>
                        </div>
                        
                        {termsAccepted && responsibilityCodeAccepted && (
                          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Aceptaciones completadas</span>
                          </div>
                        )}
                        
                        <p className="text-xs text-primary flex items-start gap-2">
                          <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            {t('auth.emailConfirmationNote', 'Se te enviará un email para verificar tu identidad')}
                          </span>
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loading || !termsAccepted || !responsibilityCodeAccepted}
                      >
                        {loading ? 'Creando cuenta...' : 'Crear cuenta y unirme al club'}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
