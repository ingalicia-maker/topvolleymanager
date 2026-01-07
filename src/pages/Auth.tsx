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
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';
import { z } from 'zod';
import { User, Shield, CheckCircle2, Mail, AlertCircle } from 'lucide-react';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { teams, loading: teamsLoading } = useTeams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isDirector, setIsDirector] = useState(false);
  const [directorDeclarationAccepted, setDirectorDeclarationAccepted] = useState(false);
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({}); 
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

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

  // Reset declaration when director is unchecked
  useEffect(() => {
    if (!isDirector) {
      setDirectorDeclarationAccepted(false);
    }
  }, [isDirector]);

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

    if (isSignUp && !name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
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
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('¡Bienvenido!');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    // Director must accept declaration
    if (isDirector && !directorDeclarationAccepted) {
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
          is_director: isDirector,
          assigned_teams: assignedTeams,
          director_declaration_accepted_at: isDirector ? new Date().toISOString() : null,
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

    // Check if email confirmation is needed
    if (data.user && !data.session) {
      // User created but session is null means email confirmation is required
      if (isDirector) {
        setShowEmailConfirmation(true);
      } else {
        toast.success('Cuenta creada correctamente. Ya puedes iniciar sesión.');
      }
    } else if (data.session) {
      // Auto-confirmed, redirect will happen via onAuthStateChange
      toast.success('¡Cuenta creada correctamente!');
    }

    setLoading(false);
  };

  const toggleTeam = (teamId: string) => {
    setAssignedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  // Show email confirmation screen for directors
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Confirma tu email</CardTitle>
            <CardDescription className="text-base">
              Te hemos enviado un email de confirmación a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Como Director Deportivo, necesitas confirmar tu email antes de acceder. 
                Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              ¿No recibiste el email? Revisa tu carpeta de spam o{" "}
              <button 
                onClick={() => setShowEmailConfirmation(false)}
                className="text-primary underline hover:no-underline"
              >
                vuelve a intentarlo
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Voleibol Manager</CardTitle>
          <CardDescription>Gestiona tus equipos y convocatorias</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Registrarse</TabsTrigger>
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
                  <Label htmlFor="login-password">Contraseña</Label>
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

                {/* Account type section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Por defecto te registras como <strong>Entrenador</strong></span>
                  </div>
                  
                  <div className={`rounded-lg border p-4 transition-colors ${isDirector ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="is-director"
                        checked={isDirector}
                        onCheckedChange={(checked) => setIsDirector(checked === true)}
                      />
                      <div className="space-y-1 flex-1">
                        <label
                          htmlFor="is-director"
                          className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-primary" />
                          Soy Director Deportivo
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Acceso total a todos los equipos, configuración del club y gestión de entrenadores
                        </p>
                      </div>
                    </div>
                    
                    {/* Director declaration - only shown when director is checked */}
                    {isDirector && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
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
                            Declaro la autenticidad de mis datos y confirmo que actúo como Director Deportivo del club que voy a representar en esta aplicación
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
                            Se te enviará un email de confirmación para verificar tu identidad como Director Deportivo
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {isDirector ? 'Equipos del club (opcional)' : 'Equipos que entrenas (opcional)'}
                  </Label>
                  {teamsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : teams.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {teams.map(team => (
                        <label
                          key={team.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            assignedTeams.includes(team.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Checkbox 
                            checked={assignedTeams.includes(team.id)} 
                            onCheckedChange={() => toggleTeam(team.id)}
                          />
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="text-sm">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Podrás asignar equipos después de crear tu cuenta
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || (isDirector && !directorDeclarationAccepted)}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
                
                {isDirector && !directorDeclarationAccepted && (
                  <p className="text-xs text-center text-muted-foreground">
                    Acepta la declaración de autenticidad para continuar
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
