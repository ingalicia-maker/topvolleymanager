import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import {
  Mail, Users, Send, Trash2, Loader2, Plus, Edit, Newspaper, UserX, UserCheck,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useBlogArticles } from '@/hooks/useBlog';
import { NewsletterEditor, sectionsToHtml, type NewsletterSection } from '@/components/NewsletterEditor';

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
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [subject, setSubject] = useState('');
  const [sections, setSections] = useState<NewsletterSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const { data: articles } = useBlogArticles({ publishedOnly: true });

  useEffect(() => {
    if (!subLoading && subscription.isAdmin) {
      fetchData();
    }
  }, [subLoading, subscription.isAdmin]);

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
    if (error) {
      console.error('[NewsletterAdmin] subscribers error:', error);
      toast.error(error.message);
      return;
    }
    setSubscribers((data ?? []) as any);
  };

  const fetchNewsletters = async () => {
    const { data, error } = await supabase
      .from('newsletters' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[NewsletterAdmin] newsletters error:', error);
      toast.error(error.message);
      return;
    }
    setNewsletters((data ?? []) as any);
  };

  const handleCreateNewsletter = () => {
    setEditingNewsletter(null);
    setSubject('');
    setSections([]);
    setEditDialogOpen(true);
  };

  const handleEditNewsletter = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setSubject(newsletter.subject);
    // Try to parse sections from content metadata, otherwise show raw HTML as text section
    try {
      const meta = JSON.parse(newsletter.content);
      if (Array.isArray(meta.sections)) {
        setSections(meta.sections);
      } else {
        throw new Error('no sections');
      }
    } catch {
      setSections([{ id: 'legacy', type: 'text', content: newsletter.content }]);
    }
    setEditDialogOpen(true);
  };

  const handleSaveNewsletter = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (sections.length === 0) {
      toast.error('Add at least one section');
      return;
    }
    setSaving(true);
    try {
      const htmlContent = sectionsToHtml(sections, articles || undefined);
      // Store sections metadata as JSON in content for later editing, and use a separate field for HTML
      const contentPayload = JSON.stringify({ sections, html: htmlContent });

      if (editingNewsletter) {
        const { error } = await supabase
          .from('newsletters' as any)
          .update({ subject, content: contentPayload, updated_at: new Date().toISOString() } as any)
          .eq('id', editingNewsletter.id);
        if (error) throw error;
        toast.success('Newsletter updated');
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('newsletters' as any)
          .insert({ subject, content: contentPayload, created_by: user.user?.id, status: 'draft' } as any);
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

  const getContentPreview = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.sections) {
        const textSections = parsed.sections.filter((s: any) => s.type === 'text' || s.type === 'heading');
        return textSections.map((s: any) => s.content).join(' ').substring(0, 150);
      }
    } catch {}
    return content.replace(/<[^>]*>/g, '').substring(0, 150);
  };

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
            <CardContent className="p-3 sm:p-4 text-center">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 text-primary" />
              <p className="text-xl sm:text-2xl font-bold">{activeSubscribers.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xl sm:text-2xl font-bold">{newsletters.length}</p>
              <p className="text-xs text-muted-foreground">Newsletters</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <Send className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 text-green-500" />
              <p className="text-xl sm:text-2xl font-bold">{newsletters.filter(n => n.status === 'sent').length}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="newsletters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="newsletters">
              <Newspaper className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Newsletters</span>
            </TabsTrigger>
            <TabsTrigger value="subscribers">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Subscribers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="newsletters" className="space-y-4">
            <Button onClick={handleCreateNewsletter} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Create Newsletter
            </Button>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : newsletters.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">No newsletters yet</CardContent>
              </Card>
            ) : (
              newsletters.map((nl) => (
                <Card key={nl.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{nl.subject}</h3>
                          <Badge variant={nl.status === 'sent' ? 'default' : 'secondary'} className="text-xs">{nl.status}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{getContentPreview(nl.content)}...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(nl.created_at), 'dd MMM yyyy HH:mm')}
                          {nl.sent_at && ` · Sent: ${format(new Date(nl.sent_at), 'dd MMM yyyy')}`}
                          {nl.recipient_count > 0 && ` · ${nl.recipient_count} recipients`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {nl.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditNewsletter(nl)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendNewsletter(nl)} disabled={sending === nl.id}>
                              {sending === nl.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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

          <TabsContent value="subscribers" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : subscribers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">No subscribers yet</CardContent>
              </Card>
            ) : (
              subscribers.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{sub.email}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant={sub.is_active ? 'default' : 'secondary'} className="text-xs">
                          {sub.is_active ? 'Active' : 'Unsubscribed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{sub.language}</span>
                        <span className="text-xs text-muted-foreground">{sub.source}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleToggleSubscriber(sub)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}</DialogTitle>
          </DialogHeader>
          <NewsletterEditor
            sections={sections}
            onSectionsChange={setSections}
            articles={articles || undefined}
            subject={subject}
            onSubjectChange={setSubject}
          />
          <DialogFooter className="gap-2 sm:gap-0">
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
