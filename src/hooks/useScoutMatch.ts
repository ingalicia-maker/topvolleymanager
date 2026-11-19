import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { replay } from '@/lib/scout/engine';
import type { ActionKind, ScoutAction, ScoutMatch } from '@/lib/scout/types';

// The scouting tables are new; until Lovable regenerates types.ts they are queried untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const queueKey = (matchId: string) => `scout-queue-${matchId}`;

function readQueue(matchId: string): ScoutAction[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(matchId)) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(matchId: string, queue: ScoutAction[]) {
  try {
    if (queue.length) localStorage.setItem(queueKey(matchId), JSON.stringify(queue));
    else localStorage.removeItem(queueKey(matchId));
  } catch {
    /* storage unavailable: actions stay in memory until sent */
  }
}

/**
 * One scouting match: its action log kept in sync between devices.
 * Actions are applied locally at once; if the network is down they wait in a local
 * queue and are sent when it comes back (ids are made on the device, so resending is safe).
 */
export function useScoutMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<ScoutMatch | null>(null);
  const [actions, setActions] = useState<ScoutAction[]>([]);
  const [pending, setPending] = useState<ScoutAction[]>(() => (matchId ? readQueue(matchId) : []));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flushing = useRef(false);
  const lastTs = useRef(0);

  const load = useCallback(async () => {
    if (!matchId) return;
    const [{ data: m, error: me }, { data: acts, error: ae }] = await Promise.all([
      db.from('scout_matches').select('*').eq('id', matchId).maybeSingle(),
      db.from('scout_actions').select('*').eq('match_id', matchId).order('client_ts').limit(10000),
    ]);
    if (me || ae) setError((me || ae).message);
    else if (!m) setError('not_found');
    else {
      setMatch(m as ScoutMatch);
      setActions((acts || []) as ScoutAction[]);
      setError(null);
    }
    setLoading(false);
  }, [matchId]);

  const flush = useCallback(async () => {
    if (!matchId || flushing.current) return;
    const queue = readQueue(matchId);
    if (!queue.length) return;
    flushing.current = true;
    try {
      const rows = queue.map(({ id, match_id, club_id, client_ts, kind, payload }) => ({
        id,
        match_id,
        club_id,
        client_ts,
        kind,
        payload,
      }));
      const { error: e } = await db.from('scout_actions').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (!e) {
        const sent = new Set(queue.map((a) => a.id));
        const rest = readQueue(matchId).filter((a) => !sent.has(a.id));
        writeQueue(matchId, rest);
        setPending(rest);
        setActions((prev) => {
          const have = new Set(prev.map((a) => a.id));
          return [...prev, ...queue.filter((a) => !have.has(a.id))];
        });
      }
    } finally {
      flushing.current = false;
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates from the other devices.
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`scout-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scout_actions', filter: `match_id=eq.${matchId}` },
        (msg) => {
          const a = msg.new as ScoutAction;
          setActions((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scout_matches', filter: `id=eq.${matchId}` },
        (msg) => setMatch(msg.new as ScoutMatch),
      )
      .subscribe((status) => {
        // After a reconnection, catch up on anything missed.
        if (status === 'SUBSCRIBED') load();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  // Retry the offline queue.
  useEffect(() => {
    flush();
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    const timer = window.setInterval(flush, 5000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, [flush]);

  const all = useMemo(() => {
    const have = new Set(actions.map((a) => a.id));
    return [...actions, ...pending.filter((a) => !have.has(a.id))];
  }, [actions, pending]);

  const state = useMemo(() => replay(all, match?.best_of ?? 5), [all, match?.best_of]);

  const record = useCallback(
    (kind: ActionKind, payload: ScoutAction['payload']) => {
      if (!match) return null;
      // Strictly increasing timestamps keep the order even for fast taps.
      const now = Math.max(Date.now(), lastTs.current + 1);
      lastTs.current = now;
      const action: ScoutAction = {
        id: crypto.randomUUID(),
        match_id: match.id,
        club_id: match.club_id,
        client_ts: now,
        kind,
        payload,
      };
      const queue = [...readQueue(match.id), action];
      writeQueue(match.id, queue);
      setPending((prev) => [...prev, action]);
      flush();
      return action;
    },
    [match, flush],
  );

  const undo = useCallback(() => {
    const last = state.effective[state.effective.length - 1];
    if (!last) return;
    record('undo', { target: last.id });
  }, [state.effective, record]);

  const setStatus = useCallback(
    async (status: ScoutMatch['status']) => {
      if (!match) return;
      setMatch({ ...match, status });
      await db.from('scout_matches').update({ status }).eq('id', match.id);
    },
    [match],
  );

  return { match, state, loading, error, pendingCount: pending.length, record, undo, setStatus, reload: load };
}
