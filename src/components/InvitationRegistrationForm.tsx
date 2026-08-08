import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { z } from 'zod';
import { User, Shield, CheckCircle2, Mail, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';
import { triggerCoachWelcome } from '@/components/CoachWelcomeDialog';
import { TurnstileWidget, useTurnstile } from '@/components/TurnstileWidget';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

interface ClubPreview {
  club_id: string;
  club_name: string;
  role: string;
  responsibility_code: string | null;
  responsible_person_name: string | null;
  expires_at: string;
  used_at: string | null;
}

interface InvitationRegistrationFormProps {
  inviteToken: string;
  onBackToLogin: () => void;
}

export function InvitationRegistrationForm({ inviteToken, onBackToLogin }: InvitationRegistrationFormProps) {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [loadingClubInfo, setLoadingClubInfo] = useState(true);
  const [clubPreview, setClubPreview] = useState<ClubPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [responsibilityCodeAccepted, setResponsibilityCodeAccepted] = useState(false);
  
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    name?: string;
    surname1?: string;
  }>({});
  
  // Email verification
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Turnstile bot protection
  const turnstile = useTurnstile();

  // Fetch club info on mount
  useEffect(() => {
    fetchClubInfo();
  }, [inviteToken]);

  const fetchClubInfo = async () => {
    setLoadingClubInfo(true);
    setPreviewError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_invitation_preview', { _token: inviteToken });
      
      if (error) {
        console.error('[InvitationForm] Error fetching preview:', error);
        setPreviewError(t('invitation.invalidOrExpired'));
        setLoadingClubInfo(false);
        return;
      }

      const preview = Array.isArray(data) ? data[0] : data;

      if (!preview) {
        setPreviewError(t('invitation.invalidOrExpired'));
        setLoadingClubInfo(false);
        return;
      }

      if (preview.used_at) {
        setPreviewError(t('invitation.alreadyUsed'));
        setLoadingClubInfo(false);
        return;
      }

      if (new Date(preview.expires_at) < new Date()) {
        setPreviewError(t('invitation.expired'));
        setLoadingClubInfo(false);
        return;
      }

      setClubPreview(preview);
    } catch (error) {
      console.error('[InvitationForm] Error:', error);
      setPreviewError(t('invitation.errorLoading'));
    }
    setLoadingClubInfo(false);
  };

  const validateInputs = () => {
    const newErrors: typeof errors = {};
    
    if (!name.trim()) {
      newErrors.name = t('auth.nameRequired');
    }

    if (!surname1.trim()) {
      newErrors.surname1 = t('invitation.firstSurnameRequired');
    }

    try {
      emailSchema.parse(email);
    } catch {
      newErrors.email = t('auth.invalidEmail');
    }

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

  // Verify Turnstile token with backend
  const verifyTurnstileToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-turnstile', {
        body: { token }
      });
      if (error || !data?.success) {
        console.error('Turnstile verification failed:', error || data);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error verifying Turnstile:', err);
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    if (!termsAccepted) {
      toast.error(t('auth.acceptTermsError'));
      return;
    }

    if (clubPreview?.responsibility_code && !responsibilityCodeAccepted) {
      toast.error(t('auth.acceptResponsibilityCodeError'));
      return;
    }

    // Verify Turnstile token
    const turnstileToken = turnstile.getToken();
    if (!turnstileToken) {
      toast.error(t('auth.securityVerificationPending'));
      return;
    }

    setLoading(true);

    const isHuman = await verifyTurnstileToken(turnstileToken);
    if (!isHuman) {
      toast.error(t('auth.securityVerificationFailed'));
      turnstile.clearToken();
      setLoading(false);
      return;
    }

    // Store pending role for post-verification
    localStorage.setItem('pending_signup_role', 'coach');
    localStorage.setItem('pending_invite_token', inviteToken);
    
    const fullName = `${name.trim()} ${surname1.trim()}${surname2.trim() ? ' ' + surname2.trim() : ''}`;

    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: fullName,
          is_director: false,
          is_also_coach: true,
          assigned_teams: [],
          terms_accepted_at: new Date().toISOString(),
          responsibility_code_accepted_at: clubPreview?.responsibility_code ? new Date().toISOString() : null,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error(t('invitation.emailAlreadyRegistered'));
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    // Send custom verification email
    if (data.user && !data.session) {
      const emailSent = await sendVerificationEmail(email.trim(), fullName);
      if (emailSent) {
        setShowEmailConfirmation(true);
      } else {
        toast.error(t('auth.emailSendError', 'Error al enviar el email de verificación'));
      }
    } else if (data.session) {
      // Auto-confirmed (shouldn't happen with email verification enabled)
      await acceptInvitationAndRedirect();
    }

    setLoading(false);
  };

  const acceptInvitationAndRedirect = async () => {
    try {
      const { error } = await supabase.rpc('accept_club_invitation', { _token: inviteToken });

      if (error && !error.message?.toLowerCase().includes('ya eres miembro')) {
        console.error('[InvitationForm] Error accepting invitation:', error);
        toast.error(t('invitation.errorJoiningClub'));
        return;
      }

      // Show welcome dialog
      triggerCoachWelcome();

      toast.success(t('invitation.welcomeToClub', { name: clubPreview?.club_name }));

      // Trigger club membership refresh and wait for it to complete
      window.dispatchEvent(new Event('club-membership-changed'));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clean up localStorage once membership is accepted
      localStorage.removeItem('pending_signup_role');
      localStorage.removeItem('pending_invite_token');

      // Navigate to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[InvitationForm] Unexpected error:', error);
      toast.error(t('invitation.errorCompletingRegistration'));
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

      // Sign in after verification
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast.error(signInError.message);
        setVerifying(false);
        return;
      }

       toast.success(t('auth.accountVerified', '¡Cuenta verificada correctamente!'));
       
       // Accept invitation and redirect (no limpiamos el token hasta que se complete correctamente)
       await acceptInvitationAndRedirect();
       
     } catch (error) {
       console.error('Error verifying code:', error);
       toast.error(t('auth.verificationError', 'Error al verificar el código'));
       setVerifying(false);
     }
   };

  const handleResendEmail = async () => {
    const fullName = `${name.trim()} ${surname1.trim()}${surname2.trim() ? ' ' + surname2.trim() : ''}`;
    setResendingEmail(true);
    const success = await sendVerificationEmail(email.trim(), fullName);
    if (success) {
      toast.success(t('auth.emailResent', 'Email reenviado'));
    } else {
      toast.error(t('auth.emailResendError', 'Error al reenviar el email'));
    }
    setResendingEmail(false);
  };

  // Loading state
  if (loadingClubInfo) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (previewError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t('invitation.invalidInvitation')}</CardTitle>
          <CardDescription>{previewError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={onBackToLogin}>
            {t('invitation.backToHome')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Email verification screen
  if (showEmailConfirmation) {
    return (
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('auth.enterCodeFromEmail', 'Introduce el código de 6 dígitos que hemos enviado a tu email. Si no lo ves, revisa tu carpeta de spam.')}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm font-medium">{t('auth.verificationCode', 'Código de verificación')}</p>
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
            
            <Button
              onClick={handleVerifyCode}
              disabled={verifying || verificationCode.length !== 6}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('auth.verifying', 'Verificando...')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('auth.verifyCode', 'Verificar código')}
                </>
              )}
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('auth.noEmailReceived', '¿No recibiste el email?')}
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
                t('auth.resendEmail', 'Reenviar email')
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
              {t('auth.backToLogin', 'Volver al formulario')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-primary">
          {t('invitation.joinClub', { name: clubPreview?.club_name })}
        </CardTitle>
        <CardDescription>
          {t('invitation.invitedAs')} <strong>{clubPreview?.role === 'director' ? t('auth.director') : t('auth.coach')}</strong>.{' '}
          {t('invitation.completeRegistration')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="inv-name">{t('invitation.firstName')} *</Label>
            <Input
              id="inv-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('invitation.yourName')}
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Surname 1 */}
          <div className="space-y-2">
            <Label htmlFor="inv-surname1">{t('invitation.firstSurname')} *</Label>
            <Input
              id="inv-surname1"
              type="text"
              value={surname1}
              onChange={e => setSurname1(e.target.value)}
              placeholder={t('invitation.firstSurname')}
              disabled={loading}
            />
            {errors.surname1 && <p className="text-xs text-destructive">{errors.surname1}</p>}
          </div>

          {/* Surname 2 */}
          <div className="space-y-2">
            <Label htmlFor="inv-surname2">{t('invitation.secondSurname')}</Label>
            <Input
              id="inv-surname2"
              type="text"
              value={surname2}
              onChange={e => setSurname2(e.target.value)}
              placeholder={t('invitation.secondSurnameOptional')}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="inv-email">{t('auth.email')} *</Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              disabled={loading}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="inv-password">{t('auth.password')} *</Label>
            <Input
              id="inv-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.minCharacters')}
              disabled={loading}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="inv-confirm-password">{t('auth.confirmPassword')} *</Label>
            <Input
              id="inv-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.repeatPassword')}
              disabled={loading}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>

          {/* Terms acceptance */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="inv-terms-acceptance"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <label
                htmlFor="inv-terms-acceptance"
                className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
              >
                {t('auth.termsAcceptance')}{' '}
                <a href="/terms" target="_blank" className="text-primary underline hover:no-underline">
                  {t('auth.termsAndConditions')}
                </a>{' '}
                {t('auth.and')}{' '}
                <a href="/privacy" target="_blank" className="text-primary underline hover:no-underline">
                  {t('auth.privacyPolicy')}
                </a>{' '}
                {t('auth.ofTheApp')} *
              </label>
            </div>

            {termsAccepted && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('invitation.appTermsAccepted')}</span>
              </div>
            )}
          </div>

          {/* Club Responsibility Code */}
          {clubPreview?.responsibility_code && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <Shield className="h-4 w-4" />
                {t('invitation.clubResponsibilityCode')}
              </div>
              <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {clubPreview.responsibility_code}
                </div>
              </ScrollArea>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="inv-responsibility-acceptance"
                  checked={responsibilityCodeAccepted}
                  onCheckedChange={(checked) => setResponsibilityCodeAccepted(checked === true)}
                />
                <label
                  htmlFor="inv-responsibility-acceptance"
                  className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                >
                  {t('invitation.acceptResponsibilityCode')}{' '}
                  {clubPreview.responsible_person_name && (
                    <span className="text-muted-foreground">
                      ({t('invitation.responsiblePerson')}: {clubPreview.responsible_person_name})
                    </span>
                  )} *
                </label>
              </div>

              {responsibilityCodeAccepted && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('invitation.responsibilityCodeAccepted')}</span>
                </div>
              )}
            </div>
          )}

          {/* Email confirmation note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {t('invitation.emailVerificationNote')}
            </span>
          </div>

          {/* Turnstile invisible widget */}
          <TurnstileWidget
            onVerify={turnstile.setToken}
            onError={turnstile.clearToken}
            onExpire={turnstile.clearToken}
            invisible
          />

          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !termsAccepted || (!!clubPreview?.responsibility_code && !responsibilityCodeAccepted)}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auth.creatingAccount')}
              </>
            ) : (
              t('auth.createAccountAndJoin')
            )}
          </Button>

          {/* Back link */}
          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-primary hover:underline"
            >
              {t('invitation.alreadyHaveAccount')}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
