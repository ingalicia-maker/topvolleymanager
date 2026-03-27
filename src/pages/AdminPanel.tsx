import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import {
  Crown,
  UserPlus,
  Trash2,
  Loader2,
  Mail,
  Users,
  Building2,
  Send,
  Clock,
  TrendingUp,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistrationChart } from '@/components/admin/RegistrationChart';
import { GoogleAnalyticsCard } from '@/components/admin/GoogleAnalyticsCard';
import { RetentionMetrics } from '@/components/admin/RetentionMetrics';

interface VipUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

interface UserRegistration {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  profile_type: 'director' | 'coach';
  club_name: string | null;
  registered_at: string;
  last_activity_at: string | null;
  email_sent_at: string | null;
  notes: string | null;
}

export default function AdminPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailType, setEmailType] = useState<'welcome' | 'engagement' | 'upgrade'>('engagement');
  const [filterType, setFilterType] = useState<'all' | 'director' | 'coach'>('all');

  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'it': return it;
      default: return enUS;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchVipUsers(), fetchRegistrations()]);
    setLoading(false);
  };

  const fetchVipUsers = async () => {
    const { data, error } = await supabase
      .from('vip_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVipUsers(data);
    }
  };

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from('user_registrations')
      .select('*')
      .order('registered_at', { ascending: false });

    if (!error && data) {
      setRegistrations(data as UserRegistration[]);
    }
  };

  const handleAddVip = async () => {
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('vip_users')
      .insert({
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This email is already VIP');
      } else {
        toast.error('Error adding VIP user');
      }
    } else {
      toast.success('VIP user added');
      setNewEmail('');
      setNewName('');
      fetchVipUsers();
    }
    setAdding(false);
  };

  const handleRemoveVip = async (id: string) => {
    const { error } = await supabase
      .from('vip_users')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error removing VIP user');
    } else {
      toast.success('VIP access removed');
      fetchVipUsers();
    }
  };

  const handleSendEmail = async (registration: UserRegistration) => {
    setSendingEmail(registration.id);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('send-engagement-email', {
        body: {
          registrationId: registration.id,
          recipientEmail: registration.email,
          recipientName: registration.name || registration.email.split('@')[0],
          emailType,
          language: i18n.language,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast.success(`Email enviado a ${registration.email}`);
      fetchRegistrations();
    } catch (error: any) {
      toast.error(`Error enviando email: ${error.message}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const filteredRegistrations = registrations.filter(r => 
    filterType === 'all' || r.profile_type === filterType
  );

  const stats = {
    total: registrations.length,
    directors: registrations.filter(r => r.profile_type === 'director').length,
    coaches: registrations.filter(r => r.profile_type === 'coach').length,
    thisWeek: registrations.filter(r => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.registered_at) > weekAgo;
    }).length,
  };

  // Show loading while subscription is being fetched OR data is loading
  // This prevents the "restricted access" flash while admin status is being determined
  if (subLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('admin.title')} showBack backTo="/profile" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Verificando permisos...</span>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!subscription.isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('admin.title')} showBack backTo="/profile" />

        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Acceso restringido</CardTitle>
              <CardDescription>
                Esta cuenta no tiene permisos de administrador global.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email con el que has iniciado sesión</p>
                <p className="text-sm font-medium break-all">{user?.email || '—'}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => navigate('/profile')} className="w-full">
                  Volver a Perfil
                </Button>
                <Button onClick={() => window.location.reload()} className="w-full">
                  Reintentar
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Si este email debería ser admin, dímelo y lo habilito en el backend.
              </p>
            </CardContent>
          </Card>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('admin.title')} showBack backTo="/profile" />

      <div className="p-4 space-y-4">
        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/blog-admin">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Mail className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Blog Admin</p>
              </CardContent>
            </Card>
          </a>
          <a href="/newsletter-admin">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Mail className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Newsletter</p>
              </CardContent>
            </Card>
          </a>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analíticas
            </TabsTrigger>
            <TabsTrigger value="registrations" className="gap-2">
              <Users className="h-4 w-4" />
              Registros
            </TabsTrigger>
            <TabsTrigger value="vip" className="gap-2">
              <Crown className="h-4 w-4" />
              VIP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            {/* Registration Charts */}
            <RegistrationChart registrations={registrations} />
            
            {/* Retention Metrics */}
            <RetentionMetrics registrations={registrations} />
            
            {/* Google Analytics Card */}
            <GoogleAnalyticsCard />
          </TabsContent>

          <TabsContent value="registrations" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{stats.directors}</p>
                  <p className="text-xs text-muted-foreground">Directores</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{stats.coaches}</p>
                  <p className="text-xs text-muted-foreground">Entrenadores</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                  <p className="text-xs text-muted-foreground">Esta semana</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-2">
                    <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="director">Directores</SelectItem>
                        <SelectItem value="coach">Entrenadores</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={emailType} onValueChange={(v) => setEmailType(v as any)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Tipo de email" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Bienvenida</SelectItem>
                        <SelectItem value="engagement">Re-engagement</SelectItem>
                        <SelectItem value="upgrade">Upgrade a Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Registrations List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios Registrados ({filteredRegistrations.length})
                </CardTitle>
                <CardDescription>
                  Lista de usuarios registrados con opciones para enviar emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredRegistrations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros todavía
                  </p>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          reg.profile_type === 'director' ? 'bg-blue-500/10' : 'bg-green-500/10'
                        }`}>
                          {reg.profile_type === 'director' ? (
                            <Building2 className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Users className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium flex items-center gap-2 flex-wrap">
                            {reg.name || 'Sin nombre'}
                            <Badge variant={reg.profile_type === 'director' ? 'default' : 'secondary'} className="text-xs">
                              {reg.profile_type === 'director' ? 'Director' : 'Coach'}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{reg.email}</p>
                          {reg.club_name && (
                            <p className="text-sm text-muted-foreground">
                              Club: {reg.club_name}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(reg.registered_at), 'dd MMM yyyy HH:mm', { locale: getLocale() })}
                            </span>
                            {reg.email_sent_at && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Mail className="h-3 w-3" />
                                Email enviado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(reg)}
                          disabled={sendingEmail === reg.id}
                        >
                          {sendingEmail === reg.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Enviar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vip" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  {t('admin.vipUsers')}
                </CardTitle>
                <CardDescription>
                  VIP users have unlimited access to all features without payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add VIP form */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="font-medium">{t('admin.addVip')}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vip-email">{t('admin.email')}</Label>
                    <Input
                      id="vip-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vip-name">{t('admin.name')} ({t('common.optional')})</Label>
                    <Input
                      id="vip-name"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <Button onClick={handleAddVip} disabled={adding || !newEmail.trim()} className="w-full">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {t('admin.addVip')}
                  </Button>
                </div>

                {/* VIP users list */}
                <div className="space-y-2">
                  {vipUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">{t('admin.noVips')}</p>
                  ) : (
                    vipUsers.map((vip) => (
                      <div
                        key={vip.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Crown className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {vip.name || 'VIP User'}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {vip.email}
                            </p>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('admin.removeVip')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {vip.email} will lose VIP access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveVip(vip.id)}>
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
