import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MatchState } from '@/lib/scout/types';
import { pct, playerStats, teamStats } from '@/lib/scout/stats';
import type { PlayerInfo } from './AttackChart';

interface Props {
  state: MatchState;
  players: Record<string, PlayerInfo>;
}

export function ScoutStats({ state, players }: Props) {
  const { t } = useTranslation();
  const [set, setSet] = useState<string>('all');
  const filter = set === 'all' ? 'all' : Number(set);
  const team = teamStats(state, filter);
  const skills = state.skills.filter((s) => filter === 'all' || s.set === filter);
  const rows = playerStats(skills);

  const rotRows = team.rotations.filter((r) => r.sideout.total + r.breakPts.total > 0);
  const weakest = rotRows.length
    ? [...rotRows].sort(
        (a, b) =>
          (a.sideout.won + a.breakPts.won) / (a.sideout.total + a.breakPts.total) -
          (b.sideout.won + b.breakPts.won) / (b.sideout.total + b.breakPts.total),
      )[0]
    : null;

  const log = (filter === 'all' ? state.current?.pointLog : state.sets.find((s) => s.number === filter)?.pointLog) ?? [];
  const last10 = log.slice(-10);

  return (
    <div className="space-y-4">
      <Select value={set} onValueChange={setSet}>
        <SelectTrigger className="h-9 text-xs w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('scout.allSets')}</SelectItem>
          {state.sets.map((s) => (
            <SelectItem key={s.number} value={String(s.number)}>
              {t('scout.set', { n: s.number })} ({s.us}-{s.them})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">{t('scout.pointsWon')}</p>
          <p className="text-2xl font-bold text-green-600">{team.won}</p>
          <ul className="text-xs mt-1 space-y-0.5">
            <li>{t('scout.attackPoints')}: {team.attackPoints}</li>
            <li>{t('scout.aces')}: {team.aces}</li>
            <li>{t('scout.blockPoints')}: {team.blockPoints}</li>
            <li>{t('scout.oppErrors')}: {team.oppErrors}</li>
          </ul>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">{t('scout.pointsGiven')}</p>
          <p className="text-2xl font-bold text-red-600">{team.lost}</p>
          <ul className="text-xs mt-1 space-y-0.5">
            <li>{t('scout.ourErrors')}: {team.ourErrors}</li>
            <li>{t('scout.oppPoints')}: {team.oppPoints}</li>
          </ul>
        </div>
      </div>

      {last10.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">{t('scout.lastPoints')}</p>
          <div className="flex gap-1">
            {last10.map((p, i) => (
              <span key={i} className={`h-6 flex-1 rounded ${p === 'us' ? 'bg-green-500' : 'bg-red-500'}`} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-1">{t('scout.byRotation')}</h3>
        {weakest && (
          <p className="text-xs text-amber-700 mb-1">{t('scout.weakest', { rot: t('scout.rotationShort', { n: weakest.rotation }) })}</p>
        )}
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-right">
              <th className="text-left font-medium py-1">{t('scout.rotation')}</th>
              <th className="font-medium">{t('scout.sideout')}</th>
              <th className="font-medium">{t('scout.breakPt')}</th>
            </tr>
          </thead>
          <tbody>
            {team.rotations.map((r) => (
              <tr key={r.rotation} className={`text-right border-t ${weakest?.rotation === r.rotation ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                <td className="text-left py-1.5 font-medium">{t('scout.rotationShort', { n: r.rotation })}</td>
                <td>{r.sideout.won}/{r.sideout.total} · {pct(r.sideout.won, r.sideout.total)}</td>
                <td>{r.breakPts.won}/{r.breakPts.total} · {pct(r.breakPts.won, r.breakPts.total)}</td>
              </tr>
            ))}
            <tr className="text-right border-t font-semibold">
              <td className="text-left py-1.5">{t('scout.total')}</td>
              <td>{pct(team.sideout.won, team.sideout.total)}</td>
              <td>{pct(team.breakPts.won, team.breakPts.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-semibold text-sm mb-1">{t('scout.players')}</h3>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('scout.noData')}</p>
        ) : (
          <table className="w-full text-xs min-w-[520px]">
            <thead className="text-muted-foreground">
              <tr className="text-right">
                <th className="text-left font-medium py-1" />
                <th className="font-medium" colSpan={2}>{t('scout.serveCol')}</th>
                <th className="font-medium" colSpan={2}>{t('scout.recCol')}</th>
                <th className="font-medium" colSpan={3}>{t('scout.attCol')}</th>
                <th className="font-medium">{t('scout.blkCol')}</th>
                <th className="font-medium">Pts</th>
              </tr>
              <tr className="text-right text-[10px]">
                <th />
                <th className="font-normal">Tot</th>
                <th className="font-normal"># / =</th>
                <th className="font-normal">Tot</th>
                <th className="font-normal">{t('scout.positivePct')}</th>
                <th className="font-normal">Tot</th>
                <th className="font-normal">{t('scout.killPct')}</th>
                <th className="font-normal">{t('scout.eff')}</th>
                <th className="font-normal">#</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player} className="text-right border-t">
                  <td className="text-left py-1.5 font-medium whitespace-nowrap">
                    {players[r.player]?.label} {players[r.player]?.name}
                  </td>
                  <td>{r.serve.total || ''}</td>
                  <td>{r.serve.total ? `${r.serve.perfect} / ${r.serve.errors}` : ''}</td>
                  <td>{r.reception.total || ''}</td>
                  <td>{r.reception.total ? pct(r.reception.positive, r.reception.total) : ''}</td>
                  <td>{r.attack.total || ''}</td>
                  <td>{r.attack.total ? pct(r.attack.kills, r.attack.total) : ''}</td>
                  <td>{r.attack.total ? `${Math.round(r.attack.eff * 100)}%` : ''}</td>
                  <td>{r.blockPoints || ''}</td>
                  <td className="font-semibold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
