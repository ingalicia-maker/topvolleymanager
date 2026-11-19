import type {
  AttackPhase,
  LineupPayload,
  MatchState,
  Phase,
  PointPayload,
  Rally,
  RecordedSkill,
  Role,
  ScorePayload,
  ScoutAction,
  SetState,
  Side,
  Skill,
  SkillPayload,
  SubPayload,
  UndoPayload,
} from './types';

// Replays the action log of a match into its full state. Pure: same log, same state,
// on every device.

export function sortActions(actions: ScoutAction[]): ScoutAction[] {
  return [...actions].sort((a, b) => a.client_ts - b.client_ts || a.id.localeCompare(b.id));
}

/** Which side wins the rally because of this skill, if any. */
export function pointFromSkill(skill: Skill, grade: SkillPayload['grade']): Side | null {
  if (grade === '=') return 'them';
  if (grade === '#' && (skill === 'serve' || skill === 'attack' || skill === 'block')) return 'us';
  if (grade === '/' && skill === 'attack') return 'them'; // blocked
  return null;
}

export function setTarget(setNumber: number, bestOf: number): number {
  return setNumber === bestOf ? 15 : 25;
}

/** Rotation label: position of the setter (1–6), or the rotation counter + 1 without a setter. */
export function rotationOf(set: SetState): number {
  const setter = set.positions.findIndex((p) => set.roles[p] === 'S');
  if (setter >= 0) return setter + 1;
  return (set.rotationCount % 6) + 1;
}

/** Players actually on court: the first libero replaces the middles in the back row
 *  (except the middle who is serving). Index 0 = P1. */
export function onCourt(set: SetState): string[] {
  const libero = set.liberos[0];
  if (!libero) return set.positions;
  return set.positions.map((p, i) => {
    const pos = i + 1;
    const back = pos === 5 || pos === 6 || (pos === 1 && !set.weServe);
    return back && set.roles[p] === 'MB' ? libero : p;
  });
}

export function roleOf(set: SetState | null, playerId: string): Role | undefined {
  if (!set) return undefined;
  if (set.liberos.includes(playerId)) return 'L';
  return set.roles[playerId];
}

/** Whether `incoming` may replace `outgoing` under the substitution rules. */
export function canSubstitute(set: SetState, outgoing: string, incoming: string): { ok: boolean; reason?: string } {
  if (set.subsUsed >= 6) return { ok: false, reason: 'limit' };
  if (set.positions.includes(incoming)) return { ok: false, reason: 'on_court' };
  if (set.liberos.includes(incoming) || set.liberos.includes(outgoing)) return { ok: false, reason: 'libero' };
  if (set.subsClosed.includes(outgoing)) return { ok: false, reason: 'closed' };
  const pairOut = set.subPairs[outgoing];
  const pairIn = set.subPairs[incoming];
  if (pairOut && pairOut !== incoming) return { ok: false, reason: 'pair' };
  if (pairIn && pairIn !== outgoing) return { ok: false, reason: 'pair' };
  if (set.subsClosed.includes(incoming)) return { ok: false, reason: 'closed' };
  return { ok: true };
}

function newSet(l: LineupPayload): SetState {
  return {
    number: l.set,
    us: 0,
    them: 0,
    positions: [...l.positions],
    roles: { ...l.roles },
    liberos: [...l.liberos],
    weServe: l.weServe,
    rotationCount: 0,
    subsUsed: 0,
    subPairs: {},
    subsClosed: [],
    starters: [...l.positions],
    winner: null,
    pointLog: [],
  };
}

export function replay(all: ScoutAction[], bestOf: number): MatchState {
  const ordered = sortActions(all);
  const undone = new Set<string>();
  // Undo targets the latest effective action at the time; resolve from the end so that
  // undoing an undo is not needed (the UI never does that).
  for (const a of ordered) if (a.kind === 'undo') undone.add((a.payload as UndoPayload).target);
  const effective = ordered.filter((a) => a.kind !== 'undo' && !undone.has(a.id));

  const sets: SetState[] = [];
  let current: SetState | null = null;
  let setsUs = 0;
  let setsThem = 0;
  const toWin = Math.ceil(bestOf / 2);
  const skills: RecordedSkill[] = [];
  const rallies: Rally[] = [];
  let open: RecordedSkill[] = [];
  let rallyStart: { rotation: number; phase: Phase } | null = null;
  let lastPoint: MatchState['lastPoint'] = null;
  let attacksSinceReception = 0;
  let receivedThisRally = false;

  const finished = () => setsUs >= toWin || setsThem >= toWin;

  const beginRally = (s: SetState) => {
    rallyStart = { rotation: rotationOf(s), phase: s.weServe ? 'break' : 'sideout' };
    attacksSinceReception = 0;
    receivedThisRally = false;
  };

  const award = (to: Side, at: number) => {
    const s = current;
    if (!s || s.winner) return;
    const start = rallyStart ?? { rotation: rotationOf(s), phase: s.weServe ? 'break' : 'sideout' };
    rallies.push({ set: s.number, rotation: start.rotation, phase: start.phase, winner: to, skills: open });
    open = [];
    if (to === 'us') {
      s.us++;
      if (!s.weServe) {
        // Side-out: rotate clockwise, the player in P2 goes to serve.
        s.positions = [...s.positions.slice(1), s.positions[0]];
        s.rotationCount++;
        s.weServe = true;
      }
    } else {
      s.them++;
      s.weServe = false;
    }
    s.pointLog.push(to);
    lastPoint = { to, at };
    checkSetEnd(s);
    if (!s.winner) beginRally(s);
  };

  const checkSetEnd = (s: SetState) => {
    const target = setTarget(s.number, bestOf);
    if ((s.us >= target || s.them >= target) && Math.abs(s.us - s.them) >= 2) {
      s.winner = s.us > s.them ? 'us' : 'them';
      if (s.winner === 'us') setsUs++;
      else setsThem++;
    }
  };

  for (const a of effective) {
    switch (a.kind) {
      case 'lineup': {
        const l = a.payload as LineupPayload;
        const existing = sets.find((s) => s.number === l.set);
        if (existing && existing.us + existing.them === 0) {
          // Line-up corrected before the first point.
          Object.assign(existing, newSet(l));
          current = existing;
        } else if (!existing && !finished()) {
          current = newSet(l);
          sets.push(current);
        }
        open = [];
        if (current) beginRally(current);
        break;
      }
      case 'skill': {
        const s = current;
        if (!s || s.winner) break;
        const p = a.payload as SkillPayload;
        if (!rallyStart) beginRally(s);
        let attackPhase: AttackPhase | undefined;
        if (p.skill === 'reception') {
          receivedThisRally = true;
          attacksSinceReception = 0;
        }
        if (p.skill === 'attack') {
          attackPhase = receivedThisRally && attacksSinceReception === 0 ? 'K1' : 'transition';
          attacksSinceReception++;
        }
        const rec: RecordedSkill = {
          ...p,
          id: a.id,
          set: s.number,
          rotation: rallyStart!.rotation,
          phase: rallyStart!.phase,
          attackPhase,
          scoreUs: s.us,
          scoreThem: s.them,
        };
        skills.push(rec);
        open.push(rec);
        const winner = pointFromSkill(p.skill, p.grade);
        if (winner) award(winner, a.client_ts);
        break;
      }
      case 'point': {
        award((a.payload as PointPayload).to, a.client_ts);
        break;
      }
      case 'sub': {
        const s = current;
        if (!s || s.winner) break;
        const { out, in: incoming } = a.payload as SubPayload;
        const idx = s.positions.indexOf(out);
        if (idx < 0) break;
        s.positions = s.positions.map((p) => (p === out ? incoming : p));
        if (incoming in s.subPairs || s.subPairs[out] === incoming) {
          // Coming back for the partner: the pair is now closed for the set.
          s.subsClosed.push(incoming, out);
        }
        s.subPairs[out] = incoming;
        s.subPairs[incoming] = out;
        if (!(incoming in s.roles) && s.roles[out]) s.roles[incoming] = s.roles[out];
        s.subsUsed++;
        break;
      }
      case 'score': {
        const s = current;
        if (!s) break;
        const sc = a.payload as ScorePayload;
        if (s.winner === 'us') setsUs--;
        if (s.winner === 'them') setsThem--;
        s.winner = null;
        s.us = Math.max(0, sc.us);
        s.them = Math.max(0, sc.them);
        checkSetEnd(s);
        break;
      }
    }
  }

  const needsLineup = !finished() && (!current || current.winner !== null);

  return {
    sets,
    current,
    setsUs,
    setsThem,
    finished: finished(),
    needsLineup,
    skills,
    rallies,
    openRally: open,
    effective,
    lastPoint,
  };
}

/** The skill most likely to come next, to pre-select it. */
export function suggestSkill(state: MatchState): Skill {
  const s = state.current;
  if (!s) return 'serve';
  const last = state.openRally[state.openRally.length - 1];
  if (!last) return s.weServe ? 'serve' : 'reception';
  switch (last.skill) {
    case 'serve':
      return 'block';
    case 'reception':
    case 'dig':
    case 'set':
    case 'freeball':
      return 'attack';
    case 'attack':
      return last.grade === '/' || last.grade === '!' ? 'attack' : 'block';
    case 'block':
      return 'dig';
  }
}

/** Grades that make sense for each skill, DataVolley style. */
export const GRADES: Record<Skill, SkillPayload['grade'][]> = {
  serve: ['#', '+', '!', '-', '/', '='],
  reception: ['#', '+', '!', '-', '/', '='],
  attack: ['#', '+', '!', '-', '/', '='],
  block: ['#', '+', '!', '-', '/', '='],
  dig: ['#', '+', '!', '-', '/', '='],
  set: ['#', '+', '-', '='],
  freeball: ['#', '+', '-', '='],
};
