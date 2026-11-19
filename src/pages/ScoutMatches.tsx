import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Loader2, Plus, Radio, Trash2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/hooks/useClub';
import { useEvents } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import type { ScoutMatch } from '@/lib/scout/types';
import '@/lib/scout/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const NONE = '__none__';

export default function ScoutMatches() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { club } = useClub();
  const { teams } = useTeams();
  const { events } = useEvents();
  const { isDirector, assignedTeams } = useUserRole();
  const [matches, setMatches] = useState<ScoutMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ScoutMatch | null>(null);

  const myTeams = useMemo(
    () => (isDirector ? teams : teams.filter((tm) => assignedTeams.includes(tm.id))),
    [teams, isDirector, assignedTeams],
  );

  const load = async () => {
    const { data, error } = await db
      .from('scout_matches')
      .select('*')
      .order('match_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error(error);
    setMatches((data || []) as ScoutMatch[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = matches.filter((m) => isDirector || myTeams.some((tm) => tm.id === m.team_id));
  const teamName = (id: string) => teams.find((tm) => tm.id === id)?.name ?? '';

  const remove = async (m: ScoutMatch) => {
    const { error } = await db.from('scout_matches').delete().eq('id', m.id);
    if (error) toast.error(error.message);
    else setMatches((prev) => prev.filter((x) => x.id !== m.id));
    setToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div
        className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.back')}
            className="-ml-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => navigate('/coach')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('scout.title')}</h1>
            <p className="text-primary-foreground/80 text-sm">{t('scout.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button className="w-full gap-1" onClick={() => setOpen(true)} disabled={!club || myTeams.length === 0}>
          <Plus className="h-4 w-4" /> {t('scout.newMatch')}
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">{t('scout.noMatches')}</CardContent>
          </Card>
        ) : (
          visible.map((m) => (
            <Card key={m.id} className="shadow-sm">
              <CardContent className="p-0 flex items-center">
                <Link to={`/coach/scouting/${m.id}`} className="flex-1 p-4 flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: teams.find((tm) => tm.id === m.team_id)?.color ?? '#94a3b8' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {teamName(m.team_id)} vs {m.opponent || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      {new Date(m.match_date + 'T12:00:00').toLocaleDateString(i18n.language)}
                      {m.status === 'live' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <Radio className="h-3 w-3" /> {t('scout.live')}
                        </span>
                      ) : (
                        <span>{t('scout.finished')}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('scout.deleteMatch')}
                  className="mr-2 text-muted-foreground"
                  onClick={() => setToDelete(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NewMatchDialog
        open={open}
        onOpenChange={setOpen}
        teams={myTeams}
        events={events.filter((e) => e.type === 'match')}
        onCreate={async (values) => {
          if (!club) return;
          const { data, error } = await db
            .from('scout_matches')
            .insert({ ...values, club_id: club.id })
            .select()
            .single();
          if (error) {
            toast.error(error.message);
            return;
          }
          setOpen(false);
          navigate(`/coach/scouting/${data.id}`);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('scout.deleteMatch')}</AlertDialogTitle>
            <AlertDialogDescription>{t('scout.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('scout.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && remove(toDelete)}
            >
              {t('scout.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}

interface NewMatchValues {
  team_id: string;
  opponent: string;
  match_date: string;
  best_of: 3 | 5;
  event_id: string | null;
}

function NewMatchDialog({
  open,
  onOpenChange,
  teams,
  events,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teams: { id: string; name: string }[];
  events: { id: string; team_id: string; date: string; opponent: string | null; title: string }[];
  onCreate: (v: NewMatchValues) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [teamId, setTeamId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(today);
  const [bestOf, setBestOf] = useState<'3' | '5'>('5');
  const [eventId, setEventId] = useState(NONE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTeamId(teams.length === 1 ? teams[0].id : '');
      setOpponent('');
      setDate(today);
      setBestOf('5');
      setEventId(NONE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Matches of the team within two weeks of today, nearest first.
  const teamEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.team_id === teamId && Math.abs(new Date(e.date).getTime() - now) < 15 * 86400000)
      .sort((a, b) => Math.abs(new Date(a.date).getTime() - now) - Math.abs(new Date(b.date).getTime() - now));
  }, [events, teamId]);

  const pickEvent = (id: string) => {
    setEventId(id);
    const ev = events.find((e) => e.id === id);
    if (ev) {
      if (ev.opponent) setOpponent(ev.opponent);
      setDate(ev.date.slice(0, 10));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('scout.newMatch')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('scout.team')}</Label>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v); setEventId(NONE); }}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {teams.map((tm) => (
                  <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {teamId && teamEvents.length > 0 && (
            <div>
              <Label>{t('scout.linkEvent')}</Label>
              <Select value={eventId} onValueChange={pickEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('scout.noEvent')}</SelectItem>
                  {teamEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {new Date(e.date.slice(0, 10) + 'T12:00:00').toLocaleDateString(i18n.language)} · {e.opponent || e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>{t('scout.opponent')}</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder={t('scout.opponentPh')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('scout.date')}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('scout.bestOf')}</Label>
              <Select value={bestOf} onValueChange={(v) => setBestOf(v as '3' | '5')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t('scout.bestOf5')}</SelectItem>
                  <SelectItem value="3">{t('scout.bestOf3')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!teamId || saving}
            onClick={async () => {
              setSaving(true);
              await onCreate({
                team_id: teamId,
                opponent: opponent.trim(),
                match_date: date || today,
                best_of: Number(bestOf) as 3 | 5,
                event_id: eventId === NONE ? null : eventId,
              });
              setSaving(false);
            }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t('scout.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
