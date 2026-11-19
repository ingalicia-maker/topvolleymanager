// Live scouting: data stored in scout_actions.payload, and the state replayed from it.

export type Role = 'S' | 'OH' | 'MB' | 'OPP' | 'L' | 'U';
export type Grade = '#' | '+' | '!' | '-' | '/' | '=';
export type Skill = 'serve' | 'reception' | 'attack' | 'block' | 'dig' | 'set' | 'freeball';
export type Side = 'us' | 'them';

/** Where the attack started, as a DataVolley-style zone on our half (4·3·2 front, 5·6·1 back). */
export type OriginZone = 1 | 2 | 3 | 4 | 5 | 6;

/** A point on the opponent's half. x: 0–9 m from our left sideline, d: 0–9 m from the net.
 *  Values outside 0–9 mean the ball landed out. */
export interface Landing {
  x: number;
  d: number;
}

export interface LineupPayload {
  set: number;
  /** Player ids in positions P1..P6 (index 0 = P1, the server). */
  positions: string[];
  roles: Record<string, Role>;
  liberos: string[];
  weServe: boolean;
}

export interface SkillPayload {
  skill: Skill;
  player: string;
  grade: Grade;
  origin?: OriginZone;
  landing?: Landing;
}

export interface PointPayload {
  to: Side;
}

export interface SubPayload {
  out: string;
  in: string;
}

export interface ScorePayload {
  us: number;
  them: number;
}

export interface UndoPayload {
  target: string;
}

export type ActionKind = 'lineup' | 'skill' | 'point' | 'sub' | 'score' | 'undo';

export interface ScoutAction {
  id: string;
  match_id: string;
  club_id: string;
  client_ts: number;
  kind: ActionKind;
  payload: LineupPayload | SkillPayload | PointPayload | SubPayload | ScorePayload | UndoPayload | Record<string, unknown>;
  created_by?: string | null;
  created_at?: string;
}

export interface ScoutMatch {
  id: string;
  club_id: string;
  team_id: string;
  event_id: string | null;
  opponent: string;
  match_date: string;
  best_of: 3 | 5;
  status: 'live' | 'finished';
  created_at: string;
  updated_at: string;
}

/** Rally phase from our point of view: side-out when we received, break when we served. */
export type Phase = 'sideout' | 'break';

/** K1 = first attack after our reception; transition = any other attack. */
export type AttackPhase = 'K1' | 'transition';

export interface RecordedSkill extends SkillPayload {
  id: string;
  set: number;
  /** Setter position (1–6) when the action happened, or the rotation counter if there is no setter. */
  rotation: number;
  phase: Phase;
  attackPhase?: AttackPhase;
  scoreUs: number;
  scoreThem: number;
}

export interface Rally {
  set: number;
  rotation: number;
  phase: Phase;
  winner: Side;
  skills: RecordedSkill[];
}

export interface SetState {
  number: number;
  us: number;
  them: number;
  positions: string[];
  roles: Record<string, Role>;
  liberos: string[];
  weServe: boolean;
  /** Rotations made since the line-up (0–5), used when there is no setter. */
  rotationCount: number;
  subsUsed: number;
  /** For each player who started or came in: the player they are paired with. */
  subPairs: Record<string, string>;
  /** Players who already came back in for their partner (can't be substituted again this set). */
  subsClosed: string[];
  starters: string[];
  winner: Side | null;
  /** Points of the set in order, for runs and the last-points strip. */
  pointLog: Side[];
}

export interface MatchState {
  sets: SetState[];
  current: SetState | null;
  setsUs: number;
  setsThem: number;
  finished: boolean;
  /** True when a set just ended and the next one needs a line-up. */
  needsLineup: boolean;
  skills: RecordedSkill[];
  rallies: Rally[];
  /** Skills of the rally in progress. */
  openRally: RecordedSkill[];
  /** Effective actions in order (undone ones removed), for "undo last". */
  effective: ScoutAction[];
  lastPoint: { to: Side; at: number } | null;
}
