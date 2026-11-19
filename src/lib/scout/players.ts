import type { DbPlayer } from '@/hooks/usePlayers';
import type { PlayerInfo } from '@/components/scout/AttackChart';

/** Short label for a court token: the shirt number, or initials without one. */
export function playerInfo(p: DbPlayer): PlayerInfo {
  const initials = `${p.name?.[0] ?? ''}${p.surname1?.[0] ?? ''}`.toUpperCase();
  const name = [p.name, p.surname1 ? `${p.surname1[0]}.` : ''].filter(Boolean).join(' ');
  return { label: p.number != null ? String(p.number) : initials || '?', name };
}

export function playerMap(players: DbPlayer[]): Record<string, PlayerInfo> {
  const m: Record<string, PlayerInfo> = {};
  for (const p of players) m[p.id] = playerInfo(p);
  return m;
}

export function teamRoster(players: DbPlayer[], teamId: string): DbPlayer[] {
  return players
    .filter((p) => !p.is_archived && (p.teams || []).includes(teamId))
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
}
