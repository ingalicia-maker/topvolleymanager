import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Mail,
  Users,
  Send,
  Trash2,
  Loader2,
  Plus,
  Edit,
  Eye,
  Newspaper,
  UserX,
  UserCheck,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBlogArticles } from '@/hooks/useBlog';

interface Subscriber {
  id: string;
  email: string;
  language: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: string;
}

interface Newsletter {
  id: string;
  subject: string;
  content: string;
  article_ids: string[];
  status: string;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

export default function NewsletterAdmin() {
  const { subscription, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const { data: articles } = useBlogArticles({ publishedOnly: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchSubscribers(), fetchNewsletters()]);
    setLoading(false);
  };

  const fetchSubscribers = async () => {
    const { data, error } = await supabase
      .from('newsletter_subscribers' as any)
      .select('*')
      .order('subscribed_at', { ascending: false });
    if (!error && data) setSubscribers(data as any);
  };

  const fetchNewsletters = async () => {
    const { data, error } = await supabase
      .from('newsletters' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setNewsletters(data as any);
  };

  const handleCreateNewsletter = () => {
    setEditingNewsletter(null);
    setSubject('');
    setContent('');
    setEditDialogOpen(true);
  };

  const handleEditNewsletter = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setSubject(newsletter.subject);
    setContent(newsletter.content);
    setEditDialogOpen(true);
  };

  const handleSaveNewsletter = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Subject and content are required');
      return;
    }
    setSaving(true);
    try {
      if (editingNewsletter) {
        const { error } = await supabase
          .from('newsletters' as any)
          .update({ subject, content, updated_at: new Date().toISOString() } as any)
          .eq('id', editingNewsletter.id);
        if (error) throw error;
        toast.success('Newsletter updated');
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('newsletters' as any)
          .insert({ subject, content, created_by: user.user?.id, status: 'draft' } as any);
        if (error) throw error;
        toast.success('Newsletter created');
      }
      setEditDialogOpen(false);
      fetchNewsletters();
    } catch {
      toast.error('Error saving newsletter');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNewsletter = async (id: string) => {
    const { error } = await supabase.from('newsletters' as any).delete().eq('id', id);
    if (error) {
      toast.error('Error deleting');
    } else {
      toast.success('Newsletter deleted');
      fetchNewsletters();
    }
  };

  const handleSendNewsletter = async (newsletter: Newsletter) => {
    setSending(newsletter.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('send-newsletter', {
        body: { newsletterId: newsletter.id },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (error) throw error;
      toast.success('Newsletter sent successfully!');
      fetchNewsletters();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSending(null);
    }
  };

  const handleToggleSubscriber = async (sub: Subscriber) => {
    const { error } = await supabase
      .from('newsletter_subscribers' as any)
      .update({
        is_active: !sub.is_active,
        unsubscribed_at: sub.is_active ? new Date().toISOString() : null,
      } as any)
      .eq('id', sub.id);
    if (error) {
      toast.error('Error updating subscriber');
    } else {
      fetchSubscribers();
    }
  };

  const activeSubscribers = subscribers.filter(s => s.is_active);

  if (subLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Newsletter" showBack backTo="/admin" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!subscription.isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Newsletter" showBack backTo="/admin" />
        <div className="p-4 text-center text-muted-foreground">Acceso restringido</div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Newsletter Management" showBack backTo="/admin" />

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{activeSubscribers.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Mail className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{newsletters.length}</p>
              <p className="text-xs text-muted-foreground">Newsletters</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Send className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{newsletters.filter(n => n.status === 'sent').length}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="newsletters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="newsletters">
              <Newspaper className="h-4 w-4 mr-2" />
              Newsletters
            </TabsTrigger>
            <TabsTrigger value="subscribers">
              <Users className="h-4 w-4 mr-2" />
              Subscribers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="newsletters" className="space-y-4">
            <Button onClick={handleCreateNewsletter} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Newsletter
            </Button>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : newsletters.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No newsletters yet
                </CardContent>
              </Card>
            ) : (
              newsletters.map((nl) => (
                <Card key={nl.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{nl.subject}</h3>
                          <Badge variant={nl.status === 'sent' ? 'default' : 'secondary'}>
                            {nl.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{nl.content.substring(0, 150)}...</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(nl.created_at), 'dd MMM yyyy HH:mm')}
                          {nl.sent_at && ` · Sent: ${format(new Date(nl.sent_at), 'dd MMM yyyy HH:mm')}`}
                          {nl.recipient_count > 0 && ` · ${nl.recipient_count} recipients`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {nl.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditNewsletter(nl)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSendNewsletter(nl)}
                              disabled={sending === nl.id}
                            >
                              {sending === nl.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete newsletter?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteNewsletter(nl.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="subscribers" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : subscribers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No subscribers yet
                </CardContent>
              </Card>
            ) : (
              subscribers.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{sub.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={sub.is_active ? 'default' : 'secondary'} className="text-xs">
                          {sub.is_active ? 'Active' : 'Unsubscribed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{sub.language}</span>
                        <span className="text-xs text-muted-foreground">{sub.source}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleSubscriber(sub)}>
                      {sub.is_active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Newsletter subject..." />
            </div>
            <div>
              <label className="text-sm font-medium">Content (HTML)</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Newsletter content..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNewsletter} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingNewsletter ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
