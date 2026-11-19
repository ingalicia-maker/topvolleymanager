import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, CloudOff, Eye, Pencil, Repeat, Share2, Undo2, Flag, Loader2, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Court, OUTCOME_COLORS, type CourtToken } from '@/components/scout/Court';
import { AttackChart } from '@/components/scout/AttackChart';
import { LineupEditor } from '@/components/scout/LineupEditor';
import { ScoutStats } from '@/components/scout/ScoutStats';
import { useScoutMatch } from '@/hooks/useScoutMatch';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { canSubstitute, GRADES, onCourt, roleOf, suggestSkill } from '@/lib/scout/engine';
import { defaultOrigin, isOut, ORIGIN_ZONES } from '@/lib/scout/zones';
import { playerMap, teamRoster } from '@/lib/scout/players';
import type { Grade, Landing, LineupPayload, OriginZone, Skill } from '@/lib/scout/types';
import '@/lib/scout/i18n';

const SKILLS: Skill[] = ['serve', 'reception', 'attack', 'block', 'dig', 'set', 'freeball'];

export default function ScoutLive() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { match, state, loading, error, pendingCount, record, undo, setStatus } = useScoutMatch(matchId);
  const { allPlayers } = usePlayers();
  const { teams } = useTeams();

  const [viewOnly, setViewOnly] = useState(false);
  const [player, setPlayer] = useState<string | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [origin, setOrigin] = useState<OriginZone | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [editingLineup, setEditingLineup] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [flash, setFlash] = useState<'us' | 'them' | null>(null);

  const players = useMemo(() => playerMap(allPlayers), [allPlayers]);
  const roster = useMemo(
    () => (match ? teamRoster(allPlayers, match.team_id).map((p) => p.id) : []),
    [allPlayers, match],
  );
  const team = teams.find((tm) => tm.id === match?.team_id);
  const set = state.current;
  const court = set ? onCourt(set) : [];
  const activeSkill: Skill = skill ?? suggestSkill(state);
  const server = set?.weServe ? set.positions[0] : null;
  const actor = player ?? (activeSkill === 'serve' ? server : null);

  // Green/red flash when a point is scored.
  const lastAt = useRef<number | null>(null);
  useEffect(() => {
    const lp = state.lastPoint;
    if (!lp) return;
    if (lastAt.current !== null && lp.at !== lastAt.current) {
      setFlash(lp.to);
      const id = window.setTimeout(() => setFlash(null), 650);
      lastAt.current = lp.at;
      return () => window.clearTimeout(id);
    }
    lastAt.current = lp.at;
  }, [state.lastPoint]);

  const resetDraft = () => {
    setPlayer(null);
    setSkill(null);
    setOrigin(null);
    setLanding(null);
  };

  const positionOf = (id: string) => court.indexOf(id) + 1;

  const choosePlayer = (id: string) => {
    if (viewOnly) return;
    setPlayer(id);
    setLanding(null);
    const sk = skill ?? suggestSkill(state);
    if (sk === 'attack') setOrigin(defaultOrigin(roleOf(set, id), positionOf(id)));
  };

  const chooseSkill = (sk: Skill) => {
    setSkill(sk);
    setLanding(null);
    if (sk === 'attack' && player) setOrigin(defaultOrigin(roleOf(set, player), positionOf(player)));
  };

  const saveGrade = (grade: Grade) => {
    if (!actor) {
      toast.message(t('scout.tapPlayer'));
      return;
    }
    const payload: Record<string, unknown> = { skill: activeSkill, player: actor, grade };
    if (activeSkill === 'attack') {
      payload.origin = origin ?? defaultOrigin(roleOf(set, actor), positionOf(actor));
      if (landing) payload.landing = landing;
    }
    record('skill', payload);
    resetDraft();
  };

  const lineupInitial = (setNumber: number): Partial<LineupPayload> | undefined => {
    const prev = [...state.effective]
      .reverse()
      .find((a) => a.kind === 'lineup' && (a.payload as LineupPayload).set === setNumber - 1)?.payload as
      | LineupPayload
      | undefined;
    if (prev) {
      const prevSet = state.sets.find((s) => s.number === setNumber - 1);
      return {
        positions: prevSet?.starters ?? prev.positions,
        roles: prev.roles,
        liberos: prev.liberos,
        weServe: !prev.weServe,
      };
    }
    try {
      const saved = localStorage.getItem(`scout-lineup-${match?.team_id}`);
      if (saved) {
        const l = JSON.parse(saved) as LineupPayload;
        // Only keep players still in the roster.
        if (l.positions.every((p) => roster.includes(p))) return { ...l, liberos: l.liberos.filter((p) => roster.includes(p)) };
      }
    } catch {
      /* ignore */
    }
    return undefined;
  };

  const saveLineup = (l: LineupPayload) => {
    record('lineup', l);
    try {
      localStorage.setItem(`scout-lineup-${match?.team_id}`, JSON.stringify(l));
    } catch {
      /* ignore */
    }
    setEditingLineup(false);
    resetDraft();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p>{t('scout.notFound')}</p>
        <Button onClick={() => navigate('/coach/scouting')}>{t('common.back')}</Button>
      </div>
    );
  }

  const nextSetNumber = set && set.us + set.them === 0 && !set.winner ? set.number : state.sets.length + 1;
  const canEditLineup = !!set && !set.winner && set.us + set.them === 0 && state.openRally.length === 0;
  const showLineup = !viewOnly && match.status === 'live' && (state.needsLineup || editingLineup);
  const lastSet = state.sets[state.sets.length - 1];

  const tokens: CourtToken[] = court.map((id, i) => ({
    id,
    position: i + 1,
    label: players[id]?.label ?? '?',
    sub: t(`scout.rolesShort.${roleOf(set, id) ?? 'U'}`),
    highlight: actor === id,
    libero: set?.liberos.includes(id),
  }));

  const awaitingLanding = !viewOnly && activeSkill === 'attack' && !!actor;
  const currentSetAttacks = state.skills.filter((s) => s.skill === 'attack' && s.set === set?.number);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header + scoreboard */}
      <div
        className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-3 pb-3 relative overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        {flash && (
          <div
            className={`absolute inset-0 pointer-events-none animate-pulse ${flash === 'us' ? 'bg-green-500/60' : 'bg-red-500/60'}`}
          />
        )}
        <div className="flex items-center gap-1 relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.back')}
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => navigate('/coach/scouting')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <p className="flex-1 truncate text-sm font-medium">
            {team?.name ?? t('scout.us')} vs {match.opponent || '—'}
          </p>
          <label className="flex items-center gap-1 text-[11px]">
            <Eye className="h-3.5 w-3.5" />
            <Switch checked={viewOnly} onCheckedChange={setViewOnly} className="scale-75" />
          </label>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('scout.share')}
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success(t('scout.linkCopied'));
              } catch {
                toast.message(window.location.href);
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 mt-1 relative">
          <div className="text-center w-24">
            <p className="text-[11px] truncate opacity-80">{team?.name ?? t('scout.us')}</p>
            <p className="text-4xl font-black tabular-nums leading-none">
              {set?.us ?? 0}
              {set?.weServe && <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-300 ml-1 align-top" />}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase opacity-80">{set ? t('scout.set', { n: set.number }) : ''}</p>
            <p className="text-lg font-bold tabular-nums">
              {state.setsUs} - {state.setsThem}
            </p>
          </div>
          <div className="text-center w-24">
            <p className="text-[11px] truncate opacity-80">{match.opponent || '—'}</p>
            <p className="text-4xl font-black tabular-nums leading-none">
              {set && !set.weServe && <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-300 mr-1 align-top" />}
              {set?.them ?? 0}
            </p>
          </div>
        </div>
        {state.sets.length > 1 && (
          <p className="text-center text-[11px] opacity-80 mt-1 relative">
            {state.sets.map((s) => `${s.us}-${s.them}`).join(' · ')}
          </p>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-100 text-amber-900 text-xs px-3 py-1.5 flex items-center gap-2">
          <CloudOff className="h-3.5 w-3.5" />
          {t('scout.pending', { n: pendingCount })}
        </div>
      )}

      <Tabs defaultValue="scout" className="px-3 mt-3">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="scout">{t('scout.tabScout')}</TabsTrigger>
          <TabsTrigger value="attack">{t('scout.tabAttack')}</TabsTrigger>
          <TabsTrigger value="stats">{t('scout.tabStats')}</TabsTrigger>
        </TabsList>

        <TabsContent value="scout" className="mt-3">
          {state.finished && match.status === 'live' && !editingLineup && (
            <div className="rounded-xl border p-4 mb-3 text-center space-y-2">
              <p className="font-bold">{t('scout.matchOver')}: {state.setsUs}-{state.setsThem}</p>
              <Button size="sm" onClick={() => setStatus('finished')} className="gap-1">
                <Flag className="h-4 w-4" /> {t('scout.endMatch')}
              </Button>
            </div>
          )}
          {match.status === 'finished' && (
            <div className="rounded-xl border p-4 mb-3 text-center space-y-2">
              <p className="font-bold">{t('scout.matchOver')}: {state.setsUs}-{state.setsThem}</p>
              <Button size="sm" variant="outline" onClick={() => setStatus('live')}>
                {t('scout.reopenMatch')}
              </Button>
            </div>
          )}

          {showLineup ? (
            <div className="space-y-2">
              {lastSet?.winner && !editingLineup && (
                <p className="text-sm font-semibold text-center">
                  {t('scout.setOver', { n: lastSet.number, us: lastSet.us, them: lastSet.them })}
                </p>
              )}
              <LineupEditor
                setNumber={editingLineup && set ? set.number : nextSetNumber}
                roster={roster}
                players={players}
                initial={
                  editingLineup && set
                    ? { positions: set.positions, roles: set.roles, liberos: set.liberos, weServe: set.weServe }
                    : lineupInitial(nextSetNumber)
                }
                onSave={saveLineup}
                onCancel={editingLineup ? () => setEditingLineup(false) : undefined}
                saveLabel={editingLineup ? t('scout.saveLineup') : undefined}
              />
            </div>
          ) : set ? (
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-4 space-y-3 md:space-y-0">
              <div className="rounded-xl overflow-hidden border bg-slate-200">
                <Court
                  className="w-full h-[48vh] md:h-auto md:max-h-[80vh]"
                  tokens={tokens}
                  onTokenTap={viewOnly || match.status !== 'live' ? undefined : choosePlayer}
                  onLandingTap={awaitingLanding && match.status === 'live' ? setLanding : undefined}
                  attacks={viewOnly ? currentSetAttacks : []}
                  draft={awaitingLanding ? { origin: origin ?? undefined, landing: landing ?? undefined } : undefined}
                  showZoneNumbers={awaitingLanding}
                />
              </div>

              {!viewOnly && match.status === 'live' && !set.winner && (
                <div className="space-y-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {SKILLS.map((sk) => (
                      <button
                        key={sk}
                        onClick={() => chooseSkill(sk)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                          activeSkill === sk ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'
                        }`}
                      >
                        {t(`scout.skills.${sk}`)}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground min-h-4">
                    {actor ? (
                      <>
                        <span className="font-semibold text-foreground">
                          {players[actor]?.label} {players[actor]?.name}
                        </span>{' '}
                        · {t(`scout.skills.${activeSkill}`)}
                        {activeSkill === 'attack' && !landing && <> · {t('scout.tapLanding')}</>}
                        {activeSkill === 'attack' && landing && isOut(landing) && <> · {t('scout.outBall')}</>}
                      </>
                    ) : (
                      t('scout.tapPlayer')
                    )}
                  </p>

                  {activeSkill === 'attack' && actor && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t('scout.originLabel')}</span>
                      {ORIGIN_ZONES.map((z) => (
                        <button
                          key={z}
                          onClick={() => setOrigin(z)}
                          className={`h-8 w-8 rounded-md text-xs font-bold border ${
                            origin === z ? 'bg-blue-700 text-white border-blue-700' : 'bg-card'
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                      {landing && (
                        <button className="text-xs underline ml-1" onClick={() => setLanding(null)}>
                          {t('scout.changeDirection')}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {GRADES[activeSkill].map((g) => (
                      <button
                        key={g}
                        disabled={!actor}
                        onClick={() => saveGrade(g)}
                        className={`rounded-xl border-2 py-1.5 text-center disabled:opacity-40 active:scale-95 transition ${
                          activeSkill === 'attack' && landing && isOut(landing) && g === '=' ? 'ring-2 ring-red-500' : ''
                        }`}
                        style={{ borderColor: OUTCOME_COLORS[g] }}
                      >
                        <span className="block text-xl font-black leading-none" style={{ color: OUTCOME_COLORS[g] }}>
                          {g}
                        </span>
                        <span className="block text-[11px] mt-0.5">{t(`scout.grades.${activeSkill}.${g}`)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white h-auto py-2 flex-col gap-0"
                      onClick={() => {
                        record('point', { to: 'us' });
                        resetDraft();
                      }}
                    >
                      <span className="font-bold">{t('scout.pointUs')}</span>
                      <span className="text-[10px] opacity-90">{t('scout.pointUsHint')}</span>
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white h-auto py-2"
                      onClick={() => {
                        record('point', { to: 'them' });
                        resetDraft();
                      }}
                    >
                      <span className="font-bold">{t('scout.pointThem')}</span>
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { undo(); resetDraft(); }} disabled={state.effective.length === 0}>
                      <Undo2 className="h-4 w-4" /> {t('scout.undo')}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setSubOpen(true)}>
                      <Repeat className="h-4 w-4" /> {t('scout.substitution')} ({set.subsUsed}/6)
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setScoreOpen(true)}>
                      <Hash className="h-4 w-4" /> {t('scout.editScore')}
                    </Button>
                    {canEditLineup && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingLineup(true)}>
                        <Pencil className="h-4 w-4" /> {t('scout.editLineup')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t('scout.noData')}</p>
          )}
        </TabsContent>

        <TabsContent value="attack" className="mt-3">
          <h2 className="font-bold mb-2">{t('scout.flowsTitle')}</h2>
          <AttackChart
            attacks={state.skills.filter((s) => s.skill === 'attack')}
            players={players}
            sets={state.sets.map((s) => s.number)}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          <ScoutStats state={state} players={players} />
        </TabsContent>
      </Tabs>

      {set && (
        <SubDialog
          open={subOpen}
          onOpenChange={setSubOpen}
          positions={set.positions}
          bench={roster.filter((id) => !set.positions.includes(id) && !set.liberos.includes(id))}
          players={players}
          check={(o, i) => canSubstitute(set, o, i)}
          onConfirm={(o, i) => {
            record('sub', { out: o, in: i });
            setSubOpen(false);
            resetDraft();
          }}
        />
      )}
      {set && (
        <ScoreDialog
          open={scoreOpen}
          onOpenChange={setScoreOpen}
          us={set.us}
          them={set.them}
          onSave={(us, them) => {
            record('score', { us, them });
            setScoreOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SubDialog({
  open,
  onOpenChange,
  positions,
  bench,
  players,
  check,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  positions: string[];
  bench: string[];
  players: Record<string, { label: string; name: string }>;
  check: (out: string, incoming: string) => { ok: boolean; reason?: string };
  onConfirm: (out: string, incoming: string) => void;
}) {
  const { t } = useTranslation();
  const [out, setOut] = useState('');
  const [incoming, setIncoming] = useState('');
  useEffect(() => {
    if (open) {
      setOut('');
      setIncoming('');
    }
  }, [open]);
  const result = out && incoming ? check(out, incoming) : null;
  const name = (id: string) => `${players[id]?.label ?? '?'} · ${players[id]?.name ?? ''}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('scout.substitution')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('scout.subOut')}</Label>
            <Select value={out} onValueChange={setOut}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {positions.map((id, i) => (
                  <SelectItem key={id} value={id}>P{i + 1} · {name(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('scout.subIn')}</Label>
            <Select value={incoming} onValueChange={setIncoming}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {bench.map((id) => (
                  <SelectItem key={id} value={id}>{name(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {result && !result.ok && (
            <p className="text-sm text-red-600">
              {t('scout.subNotAllowed')}: {t(`scout.subReasons.${result.reason}`)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!result?.ok} onClick={() => onConfirm(out, incoming)}>
            {t('scout.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreDialog({
  open,
  onOpenChange,
  us,
  them,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  us: number;
  them: number;
  onSave: (us: number, them: number) => void;
}) {
  const { t } = useTranslation();
  const [a, setA] = useState(String(us));
  const [b, setB] = useState(String(them));
  useEffect(() => {
    if (open) {
      setA(String(us));
      setB(String(them));
    }
  }, [open, us, them]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('scout.editScore')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('scout.us')}</Label>
            <Input type="number" inputMode="numeric" min={0} value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <div>
            <Label>{t('scout.opponent')}</Label>
            <Input type="number" inputMode="numeric" min={0} value={b} onChange={(e) => setB(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave(Number(a) || 0, Number(b) || 0)}>{t('scout.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
