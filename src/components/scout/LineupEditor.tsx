import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LineupPayload, Role } from '@/lib/scout/types';
import type { PlayerInfo } from './AttackChart';

const ROLES: Role[] = ['S', 'OH', 'MB', 'OPP', 'U'];
/** Court layout as seen from behind our baseline: front row 4·3·2, back row 5·6·1. */
const LAYOUT = [4, 3, 2, 5, 6, 1];
const NONE = '__none__';

interface Props {
  setNumber: number;
  roster: string[];
  players: Record<string, PlayerInfo>;
  initial?: Partial<LineupPayload>;
  onSave: (lineup: LineupPayload) => void;
  onCancel?: () => void;
  saveLabel?: string;
}

export function LineupEditor({ setNumber, roster, players, initial, onSave, onCancel, saveLabel }: Props) {
  const { t } = useTranslation();
  const [positions, setPositions] = useState<string[]>(() => initial?.positions ?? ['', '', '', '', '', '']);
  const [roles, setRoles] = useState<Record<string, Role>>(() => initial?.roles ?? {});
  const [liberos, setLiberos] = useState<string[]>(() => initial?.liberos ?? []);
  const [weServe, setWeServe] = useState<boolean>(initial?.weServe ?? true);

  useEffect(() => {
    if (initial?.positions) setPositions(initial.positions);
    if (initial?.roles) setRoles(initial.roles);
    if (initial?.liberos) setLiberos(initial.liberos);
    if (initial?.weServe !== undefined) setWeServe(initial.weServe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNumber]);

  const used = useMemo(() => new Set([...positions, ...liberos].filter(Boolean)), [positions, liberos]);
  const complete = positions.every(Boolean);

  const setAt = (pos: number, id: string) => {
    setPositions((prev) => prev.map((p, i) => (i === pos - 1 ? (id === NONE ? '' : id) : p)));
  };

  const options = (current: string) =>
    roster.filter((id) => id === current || !used.has(id));

  const name = (id: string) => (players[id] ? `${players[id].label} · ${players[id].name}` : '?');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-lg">{t('scout.lineupTitle', { n: setNumber })}</h2>
        <p className="text-xs text-muted-foreground">{t('scout.lineupHint')}</p>
      </div>

      <div className="rounded-xl bg-orange-400/90 p-2">
        <div className="h-1.5 rounded bg-slate-900 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT.map((pos) => {
            const id = positions[pos - 1];
            return (
              <div key={pos} className="rounded-lg bg-white/95 p-1.5 space-y-1 shadow-sm">
                <p className="text-[10px] font-bold text-orange-800">P{pos}{pos === 1 ? ' · ' + t('scout.serving') : ''}</p>
                <Select value={id || NONE} onValueChange={(v) => setAt(pos, v)}>
                  <SelectTrigger className="h-8 text-xs px-2"><SelectValue placeholder={t('scout.pickPlayer')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {options(id).map((pid) => (
                      <SelectItem key={pid} value={pid}>{name(pid)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {id && (
                  <Select value={roles[id] ?? 'U'} onValueChange={(v) => setRoles((r) => ({ ...r, [id]: v as Role }))}>
                    <SelectTrigger className="h-7 text-[11px] px-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{t(`scout.roles.${r}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <p className="text-xs font-medium mb-1">{i === 0 ? t('scout.libero') : t('scout.libero2')}</p>
            <Select
              value={liberos[i] || NONE}
              onValueChange={(v) =>
                setLiberos((prev) => {
                  const next = [...prev];
                  next[i] = v === NONE ? '' : v;
                  return next.filter(Boolean);
                })
              }
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('scout.none')}</SelectItem>
                {options(liberos[i] ?? '').map((pid) => (
                  <SelectItem key={pid} value={pid}>{name(pid)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <ToggleGroup
        type="single"
        value={weServe ? 'us' : 'them'}
        onValueChange={(v) => v && setWeServe(v === 'us')}
        className="justify-start"
      >
        <ToggleGroupItem value="us" size="sm">{t('scout.weServe')}</ToggleGroupItem>
        <ToggleGroupItem value="them" size="sm">{t('scout.theyServe')}</ToggleGroupItem>
      </ToggleGroup>

      {!complete && <p className="text-xs text-amber-600">{t('scout.lineupIncomplete')}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            {t('scout.cancel')}
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!complete}
          onClick={() => {
            const finalRoles: Record<string, Role> = {};
            for (const id of positions) finalRoles[id] = roles[id] ?? 'U';
            onSave({ set: setNumber, positions, roles: finalRoles, liberos: liberos.filter(Boolean), weServe });
          }}
        >
          {saveLabel ?? t('scout.startSet')}
        </Button>
      </div>
    </div>
  );
}
