import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import {
  Crown,
  UserPlus,
  Trash2,
  Loader2,
  Mail,
  User,
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

interface VipUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const { subscription, loading: subLoading } = useSubscription();
  const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchVipUsers();
  }, []);

  const fetchVipUsers = async () => {
    const { data, error } = await supabase
      .from('vip_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVipUsers(data);
    }
    setLoading(false);
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

  if (subLoading || loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('admin.title')} showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Only app admins can access this page
  if (!subscription.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('admin.title')} showBack />

      <div className="p-4 space-y-4">
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
      </div>

      <BottomNav />
    </div>
  );
}
