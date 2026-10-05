import { tr } from '@/lib/tr';

// Rating criteria. The five original criteria are columns of player_ratings; a club can hide
// them, rename them and add its own, whose scores live in player_ratings.extra_scores.

export const BUILTIN_KEYS = [
  'effort_attitude',
  'communication_cooperation',
  'technical_execution',
  'decision_making',
  'leadership_initiative',
] as const;

export type BuiltinKey = typeof BUILTIN_KEYS[number];

// Spanish source text, translated with tr() when shown.
const BUILTIN_TEXT: Record<BuiltinKey, { label: string; short: string; emoji: string }> = {
  effort_attitude: { label: 'Esfuerzo y actitud', short: 'Esfuerzo', emoji: '💪' },
  communication_cooperation: { label: 'Comunicación y cooperación', short: 'Comunicación', emoji: '🤝' },
  technical_execution: { label: 'Ejecución técnica', short: 'Técnica', emoji: '🏐' },
  decision_making: { label: 'Toma de decisiones', short: 'Decisiones', emoji: '🧠' },
  leadership_initiative: { label: 'Liderazgo e iniciativa', short: 'Liderazgo', emoji: '⭐' },
};

const PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

/** A row of the rating_criteria table. */
export interface CriterionRow {
  id: string;
  club_id: string;
  builtin_key: BuiltinKey | null;
  label: string | null;
  position: number;
  is_active: boolean;
}

/** A criterion ready to show: key is the builtin column name or `c_<id>` for custom ones. */
export interface Criterion {
  key: string;
  id: string | null;
  builtinKey: BuiltinKey | null;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  active: boolean;
  position: number;
}

export interface ScoredRating {
  effort_attitude?: number | null;
  communication_cooperation?: number | null;
  technical_execution?: number | null;
  decision_making?: number | null;
  leadership_initiative?: number | null;
  extra_scores?: unknown;
}

/** Default (translated) name of an original criterion. */
export const builtinDefaultLabel = (key: BuiltinKey) => tr(BUILTIN_TEXT[key].label);

export const isBuiltinKey = (key: string): key is BuiltinKey => (BUILTIN_KEYS as readonly string[]).includes(key);
export const customKey = (id: string) => `c_${id}`;

/** All criteria of a club (active and hidden), in order. Without rows, the five originals. */
export function buildCriteria(rows: CriterionRow[]): Criterion[] {
  const byBuiltin = new Map(rows.filter((r) => r.builtin_key).map((r) => [r.builtin_key as BuiltinKey, r]));
  const list: Criterion[] = BUILTIN_KEYS.map((key, i) => {
    const row = byBuiltin.get(key);
    const text = BUILTIN_TEXT[key];
    const renamed = row?.label?.trim();
    return {
      key,
      id: row?.id ?? null,
      builtinKey: key,
      label: renamed || tr(text.label),
      shortLabel: renamed || tr(text.short),
      emoji: text.emoji,
      color: PALETTE[i],
      active: row ? row.is_active : true,
      position: row ? row.position : i,
    };
  });
  rows.filter((r) => !r.builtin_key && r.label).forEach((r) => {
    list.push({
      key: customKey(r.id),
      id: r.id,
      builtinKey: null,
      label: r.label!.trim(),
      shortLabel: r.label!.trim(),
      emoji: '🔹',
      color: '',
      active: r.is_active,
      position: r.position,
    });
  });
  list.sort((a, b) => a.position - b.position);
  list.forEach((c, i) => { if (!c.color) c.color = PALETTE[i % PALETTE.length]; });
  return list;
}

/** Score of one criterion in one rating, or null when it was not rated. */
export function scoreOf(rating: ScoredRating, key: string): number | null {
  if (isBuiltinKey(key)) {
    const v = rating[key];
    return typeof v === 'number' ? v : null;
  }
  const extra = (rating.extra_scores ?? {}) as Record<string, unknown>;
  const v = extra[key.replace(/^c_/, '')];
  return typeof v === 'number' ? v : null;
}

/** Average of the criteria that have a score in this rating. */
export function ratingAverage(rating: ScoredRating, criteria: Criterion[]): number | null {
  const scores = criteria.map((c) => scoreOf(rating, c.key)).filter((v): v is number => v !== null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

/** Average per criterion over several ratings (null when no rating has that criterion). */
export function averageByCriterion(ratings: ScoredRating[], criteria: Criterion[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  criteria.forEach((c) => {
    const scores = ratings.map((r) => scoreOf(r, c.key)).filter((v): v is number => v !== null);
    out[c.key] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  });
  return out;
}

/** Mean of the non-null averages. */
export function overallAverage(avgs: Record<string, number | null>): number {
  const vals = Object.values(avgs).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

/** Converts form values ({ key: score }) to the columns of player_ratings. */
export function toRatingColumns(values: Record<string, number>, criteria: Criterion[]) {
  const cols: Record<string, unknown> = {};
  const extra: Record<string, number> = {};
  BUILTIN_KEYS.forEach((k) => { cols[k] = null; });
  criteria.forEach((c) => {
    const v = values[c.key];
    if (typeof v !== 'number') return;
    if (c.builtinKey) cols[c.builtinKey] = v;
    else if (c.id) extra[c.id] = v;
  });
  cols.extra_scores = extra;
  return cols as {
    effort_attitude: number | null;
    communication_cooperation: number | null;
    technical_execution: number | null;
    decision_making: number | null;
    leadership_initiative: number | null;
    extra_scores: Record<string, number>;
  };
}

/** Form values for a rating (existing scores, or the default for criteria without one). */
export function formValues(criteria: Criterion[], rating?: ScoredRating | null, fallback = 5): Record<string, number> {
  const out: Record<string, number> = {};
  criteria.forEach((c) => { out[c.key] = (rating && scoreOf(rating, c.key)) ?? fallback; });
  return out;
}
