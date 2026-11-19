import type { MatchState, RecordedSkill, Skill } from './types';
import { landingZone } from './zones';

export interface AttackSummary {
  total: number;
  kills: number;
  errors: number;
  blocked: number;
  /** kills / total */
  killPct: number;
  /** (kills − errors − blocked) / total */
  eff: number;
}

export function summarizeAttacks(list: RecordedSkill[]): AttackSummary {
  const total = list.length;
  const kills = list.filter((a) => a.grade === '#').length;
  const errors = list.filter((a) => a.grade === '=').length;
  const blocked = list.filter((a) => a.grade === '/').length;
  return {
    total,
    kills,
    errors,
    blocked,
    killPct: total ? kills / total : 0,
    eff: total ? (kills - errors - blocked) / total : 0,
  };
}

export function groupBy<T, K extends string | number>(list: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const arr = m.get(k);
    if (arr) arr.push(item);
    else m.set(k, [item]);
  }
  return m;
}

export function attackLandingZone(a: RecordedSkill): number | null {
  return a.landing ? landingZone(a.landing) : null;
}

export interface SkillLine {
  total: number;
  perfect: number; // #
  positive: number; // # or +
  errors: number; // =
}

function line(list: RecordedSkill[]): SkillLine {
  return {
    total: list.length,
    perfect: list.filter((s) => s.grade === '#').length,
    positive: list.filter((s) => s.grade === '#' || s.grade === '+').length,
    errors: list.filter((s) => s.grade === '=').length,
  };
}

export interface PlayerStats {
  player: string;
  serve: SkillLine;
  reception: SkillLine;
  attack: AttackSummary;
  blockPoints: number;
  points: number;
}

export function playerStats(skills: RecordedSkill[]): PlayerStats[] {
  const byPlayer = groupBy(skills, (s) => s.player);
  const out: PlayerStats[] = [];
  for (const [player, list] of byPlayer) {
    const of = (skill: Skill) => list.filter((s) => s.skill === skill);
    const attack = summarizeAttacks(of('attack'));
    const serve = line(of('serve'));
    const blockPoints = of('block').filter((s) => s.grade === '#').length;
    out.push({
      player,
      serve,
      reception: line(of('reception')),
      attack,
      blockPoints,
      points: attack.kills + serve.perfect + blockPoints,
    });
  }
  return out.sort((a, b) => b.points - a.points);
}

export interface TeamStats {
  won: number;
  lost: number;
  aces: number;
  attackPoints: number;
  blockPoints: number;
  oppErrors: number;
  ourErrors: number;
  oppPoints: number;
  sideout: { won: number; total: number };
  breakPts: { won: number; total: number };
  rotations: { rotation: number; sideout: { won: number; total: number }; breakPts: { won: number; total: number } }[];
}

export function teamStats(state: MatchState, setFilter: number | 'all'): TeamStats {
  const rallies = state.rallies.filter((r) => setFilter === 'all' || r.set === setFilter);
  const s: TeamStats = {
    won: 0,
    lost: 0,
    aces: 0,
    attackPoints: 0,
    blockPoints: 0,
    oppErrors: 0,
    ourErrors: 0,
    oppPoints: 0,
    sideout: { won: 0, total: 0 },
    breakPts: { won: 0, total: 0 },
    rotations: [1, 2, 3, 4, 5, 6].map((rotation) => ({
      rotation,
      sideout: { won: 0, total: 0 },
      breakPts: { won: 0, total: 0 },
    })),
  };
  for (const r of rallies) {
    const last = r.skills[r.skills.length - 1];
    const decisive = last && ((r.winner === 'us' && last.grade === '#') || (r.winner === 'them' && (last.grade === '=' || (last.skill === 'attack' && last.grade === '/'))));
    if (r.winner === 'us') {
      s.won++;
      if (decisive && last.skill === 'serve') s.aces++;
      else if (decisive && last.skill === 'attack') s.attackPoints++;
      else if (decisive && last.skill === 'block') s.blockPoints++;
      else s.oppErrors++;
    } else {
      s.lost++;
      if (decisive) s.ourErrors++;
      else s.oppPoints++;
    }
    const rot = s.rotations[r.rotation - 1];
    const bucket = r.phase === 'sideout' ? 'sideout' : 'breakPts';
    s[bucket].total++;
    if (rot) rot[bucket].total++;
    if (r.winner === 'us') {
      s[bucket].won++;
      if (rot) rot[bucket].won++;
    }
  }
  return s;
}

export function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : '–';
}
