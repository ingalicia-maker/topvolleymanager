import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Court, OUTCOME_COLORS } from './Court';
import type { OriginZone, RecordedSkill } from '@/lib/scout/types';
import { ORIGIN_ZONES, LANDING_ZONES } from '@/lib/scout/zones';
import { attackLandingZone, groupBy, pct, summarizeAttacks } from '@/lib/scout/stats';

export interface PlayerInfo {
  label: string;
  name: string;
}

interface Props {
  attacks: RecordedSkill[];
  players: Record<string, PlayerInfo>;
  sets: number[];
}

type OutcomeFilter = 'all' | 'kill' | 'err' | 'cont';

export function AttackChart({ attacks, players, sets }: Props) {
  const { t } = useTranslation();
  const [set, setSet] = useState<string>('all');
  const [player, setPlayer] = useState<string>('all');
  const [rotation, setRotation] = useState<string>('all');
  const [origin, setOrigin] = useState<string>('all');
  const [phase, setPhase] = useState<string>('all');
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [view, setView] = useState<'lines' | 'zones'>('lines');
  const [selected, setSelected] = useState<string | null>(null);

  const attackers = useMemo(() => {
    const ids = Array.from(new Set(attacks.map((a) => a.player)));
    return ids.sort((a, b) => (players[a]?.label ?? '').localeCompare(players[b]?.label ?? '', undefined, { numeric: true }));
  }, [attacks, players]);

  const filtered = useMemo(
    () =>
      attacks.filter(
        (a) =>
          (set === 'all' || a.set === Number(set)) &&
          (player === 'all' || a.player === player) &&
          (rotation === 'all' || a.rotation === Number(rotation)) &&
          (origin === 'all' || a.origin === Number(origin)) &&
          (phase === 'all' || a.attackPhase === phase) &&
          (outcome === 'all' ||
            (outcome === 'kill' && a.grade === '#') ||
            (outcome === 'err' && (a.grade === '=' || a.grade === '/')) ||
            (outcome === 'cont' && ['+', '!', '-'].includes(a.grade))),
      ),
    [attacks, set, player, rotation, origin, phase, outcome],
  );

  const withDirection = filtered.filter((a) => a.origin && a.landing);
  const summary = summarizeAttacks(filtered);

  const byLanding = useMemo(() => groupBy(withDirection, (a) => attackLandingZone(a) ?? 0), [withDirection]);
  const maxLanding = Math.max(1, ...Array.from(byLanding.entries()).filter(([z]) => z > 0).map(([, l]) => l.length));
  const zoneShades =
    view === 'zones'
      ? LANDING_ZONES.map((z) => {
          const list = byLanding.get(z) ?? [];
          const s = summarizeAttacks(list);
          return {
            zone: z,
            intensity: list.length / maxLanding,
            label: list.length ? String(list.length) : '',
            sub: list.length ? `${pct(s.kills, s.total)} #` : '',
          };
        })
      : undefined;

  const byOrigin = groupBy(filtered, (a) => a.origin ?? 0);
  const sel = selected ? filtered.find((a) => a.id === selected) : null;

  const phaseLabel = (p?: string) => (p === 'K1' ? 'K1' : t('scout.transition'));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={set} onValueChange={setSet}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allSets')}</SelectItem>
            {sets.map((n) => (
              <SelectItem key={n} value={String(n)}>{t('scout.set', { n })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={player} onValueChange={setPlayer}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allPlayers')}</SelectItem>
            {attackers.map((id) => (
              <SelectItem key={id} value={id}>
                {players[id] ? `${players[id].label} · ${players[id].name}` : '?'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={origin} onValueChange={setOrigin}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allZones')}</SelectItem>
            {ORIGIN_ZONES.map((z) => (
              <SelectItem key={z} value={String(z)}>{t('scout.zone', { n: z })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rotation} onValueChange={setRotation}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allRotations')}</SelectItem>
            {[1, 2, 3, 4, 5, 6].map((r) => (
              <SelectItem key={r} value={String(r)}>{t('scout.rotationShort', { n: r })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={phase} onValueChange={setPhase}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allPhases')}</SelectItem>
            <SelectItem value="K1">{t('scout.k1')}</SelectItem>
            <SelectItem value="transition">{t('scout.transition')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={(v) => setOutcome(v as OutcomeFilter)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scout.allOutcomes')}</SelectItem>
            <SelectItem value="kill">{t('scout.outcomeKill')}</SelectItem>
            <SelectItem value="err">{t('scout.outcomeErr')}</SelectItem>
            <SelectItem value="cont">{t('scout.outcomeCont')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && setView(v as 'lines' | 'zones')}
        className="justify-start"
      >
        <ToggleGroupItem value="lines" size="sm">{t('scout.viewLines')}</ToggleGroupItem>
        <ToggleGroupItem value="zones" size="sm">{t('scout.viewZones')}</ToggleGroupItem>
      </ToggleGroup>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label={t('scout.attempts')} value={summary.total} />
        <Stat label={t('scout.killPct')} value={pct(summary.kills, summary.total)} tone="good" />
        <Stat label={t('scout.errors')} value={summary.errors + summary.blocked} tone="bad" />
        <Stat label={t('scout.eff')} value={summary.total ? `${Math.round(summary.eff * 100)}%` : '–'} />
      </div>

      <div className="rounded-xl overflow-hidden border bg-card">
        <Court
          className="w-full max-h-[70vh]"
          crop
          attacks={view === 'lines' ? withDirection : []}
          zoneShades={zoneShades}
          showZoneNumbers
          onAttackTap={view === 'lines' ? (id) => setSelected((s) => (s === id ? null : id)) : undefined}
          selectedAttack={selected}
        />
      </div>

      {sel && (
        <div className="rounded-lg border p-3 text-sm flex items-center gap-3">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: OUTCOME_COLORS[sel.grade] }} />
          <div>
            <p className="font-semibold">
              {players[sel.player]?.label} {players[sel.player]?.name} · {t('scout.zone', { n: sel.origin })} →{' '}
              {attackLandingZone(sel) ? t('scout.zone', { n: attackLandingZone(sel) }) : t('scout.out')} ·{' '}
              {t(`scout.grades.attack.${sel.grade}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('scout.attackDetail', {
                set: sel.set,
                us: sel.scoreUs,
                them: sel.scoreThem,
                rot: t('scout.rotationShort', { n: sel.rotation }),
                phase: phaseLabel(sel.attackPhase),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {(['#', '+', '!', '-', '/', '='] as const).map((g) => (
          <span key={g} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: OUTCOME_COLORS[g] }} />
            {g} {t(`scout.grades.attack.${g}`)}
          </span>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">{t('scout.noAttacks')}</p>}
      {filtered.length > withDirection.length && (
        <p className="text-xs text-muted-foreground">{t('scout.noDirection', { n: filtered.length - withDirection.length })}</p>
      )}

      {filtered.length > 0 && (
        <>
          <ZoneTable
            title={t('scout.byOrigin')}
            rows={ORIGIN_ZONES.filter((z) => byOrigin.has(z)).map((z) => ({
              label: t('scout.zone', { n: z }),
              list: byOrigin.get(z as OriginZone) ?? [],
            }))}
          />
          <ZoneTable
            title={t('scout.byLanding')}
            rows={[...LANDING_ZONES, 0]
              .filter((z) => byLanding.has(z))
              .map((z) => ({
                label: z ? t('scout.zone', { n: z }) : t('scout.out'),
                list: byLanding.get(z) ?? [],
              }))}
          />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-muted/60 py-2">
      <p className={`text-lg font-bold ${tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : ''}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function ZoneTable({ title, rows }: { title: string; rows: { label: string; list: RecordedSkill[] }[] }) {
  const { t } = useTranslation();
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="text-right">
            <th className="text-left font-medium py-1" />
            <th className="font-medium">{t('scout.attempts')}</th>
            <th className="font-medium">{t('scout.kills')}</th>
            <th className="font-medium">{t('scout.errors')}</th>
            <th className="font-medium">{t('scout.blocked')}</th>
            <th className="font-medium">{t('scout.killPct')}</th>
            <th className="font-medium">{t('scout.eff')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = summarizeAttacks(r.list);
            return (
              <tr key={r.label} className="text-right border-t">
                <td className="text-left py-1.5 font-medium">{r.label}</td>
                <td>{s.total}</td>
                <td className="text-green-600">{s.kills}</td>
                <td className="text-red-600">{s.errors}</td>
                <td className="text-orange-600">{s.blocked}</td>
                <td>{pct(s.kills, s.total)}</td>
                <td>{s.total ? `${Math.round(s.eff * 100)}%` : '–'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
