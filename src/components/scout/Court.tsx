import { useRef } from 'react';
import type { Landing, OriginZone, RecordedSkill } from '@/lib/scout/types';
import {
  COURT,
  MARGIN,
  NET_Y,
  VIEW_H,
  VIEW_W,
  isOut,
  landingToSvg,
  landingZoneRect,
  originToSvg,
  positionToSvg,
  svgToLanding,
} from '@/lib/scout/zones';

export interface CourtToken {
  id: string;
  label: string;
  sub?: string;
  /** 1–6 */
  position: number;
  highlight?: boolean;
  libero?: boolean;
}

export interface ZoneShade {
  zone: number;
  /** 0–1 */
  intensity: number;
  label?: string;
  sub?: string;
}

interface CourtProps {
  tokens?: CourtToken[];
  onTokenTap?: (id: string) => void;
  /** When set, tapping the opponent's half (or outside it) reports where the ball landed. */
  onLandingTap?: (landing: Landing) => void;
  attacks?: RecordedSkill[];
  /** Origin and landing being entered right now. */
  draft?: { origin?: OriginZone; landing?: Landing };
  zoneShades?: ZoneShade[];
  showZoneNumbers?: boolean;
  onAttackTap?: (id: string) => void;
  selectedAttack?: string | null;
  className?: string;
  /** Show only the front of our half (enough for the attack origins), for charts. */
  crop?: boolean;
}

export const OUTCOME_COLORS: Record<string, string> = {
  '#': '#16a34a', // kill
  '+': '#0ea5e9',
  '!': '#a855f7',
  '-': '#f59e0b',
  '/': '#ea580c', // blocked
  '=': '#dc2626', // error
};

export function Court({
  tokens = [],
  onTokenTap,
  onLandingTap,
  attacks = [],
  draft,
  zoneShades,
  showZoneNumbers,
  onAttackTap,
  selectedAttack,
  className,
  crop,
}: CourtProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleTap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onLandingTap || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    if (p.y > NET_Y) return; // our own half: ignore
    onLandingTap(svgToLanding(p.x, p.y));
  };

  const top = MARGIN;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${crop ? NET_Y + 7.6 : VIEW_H}`}
      className={className}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
      onPointerUp={handleTap}
      role="img"
    >
      <defs>
        {Object.entries(OUTCOME_COLORS).map(([g, c]) => (
          <marker
            key={g}
            id={`arrow-${g === '#' ? 'kill' : g === '/' ? 'blk' : g === '=' ? 'err' : g === '+' ? 'pos' : g === '!' ? 'exc' : 'neg'}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>

      {/* Free zone */}
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={onLandingTap ? '#dbeafe' : '#e2e8f0'} />
      {/* Opponent half */}
      <rect x={MARGIN} y={top} width={COURT} height={COURT} fill="#f97316" opacity={0.85} />
      {/* Our half */}
      <rect x={MARGIN} y={NET_Y} width={COURT} height={COURT} fill="#fb923c" opacity={0.85} />

      {zoneShades?.map((z) => {
        const r = landingZoneRect(z.zone);
        return (
          <g key={z.zone}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#1e3a8a" opacity={0.08 + z.intensity * 0.55} />
            {z.label && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.2} textAnchor="middle" fontSize={1.1} fontWeight={800} fill="#fff">
                {z.label}
              </text>
            )}
            {z.sub && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 1.0} textAnchor="middle" fontSize={0.55} fontWeight={600} fill="#fff">
                {z.sub}
              </text>
            )}
          </g>
        );
      })}

      {showZoneNumbers &&
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((z) => {
          const r = landingZoneRect(z);
          return (
            <text key={z} x={r.x + 0.25} y={r.y + 0.75} fontSize={0.6} fill="#fff" opacity={0.85}>
              {z}
            </text>
          );
        })}

      {/* Lines */}
      <g stroke="#fff" strokeWidth={0.06} fill="none">
        <rect x={MARGIN} y={top} width={COURT} height={COURT * 2} />
        <line x1={MARGIN} y1={NET_Y - 3} x2={MARGIN + COURT} y2={NET_Y - 3} />
        <line x1={MARGIN} y1={NET_Y + 3} x2={MARGIN + COURT} y2={NET_Y + 3} />
        {showZoneNumbers && (
          <g strokeDasharray="0.2 0.2" opacity={0.6}>
            <line x1={MARGIN + 3} y1={top} x2={MARGIN + 3} y2={NET_Y} />
            <line x1={MARGIN + 6} y1={top} x2={MARGIN + 6} y2={NET_Y} />
            <line x1={MARGIN} y1={NET_Y - 6} x2={MARGIN + COURT} y2={NET_Y - 6} />
          </g>
        )}
      </g>
      {/* Net */}
      <line x1={MARGIN - 0.6} y1={NET_Y} x2={MARGIN + COURT + 0.6} y2={NET_Y} stroke="#0f172a" strokeWidth={0.18} />

      {/* Attack flows */}
      {attacks.map((a) => {
        if (!a.origin || !a.landing) return null;
        const o = originToSvg(a.origin);
        const l = landingToSvg(a.landing);
        const color = OUTCOME_COLORS[a.grade] ?? '#334155';
        const selected = selectedAttack === a.id;
        const markerId =
          a.grade === '#' ? 'kill' : a.grade === '/' ? 'blk' : a.grade === '=' ? 'err' : a.grade === '+' ? 'pos' : a.grade === '!' ? 'exc' : 'neg';
        return (
          <g key={a.id} onPointerUp={onAttackTap ? (e) => { e.stopPropagation(); onAttackTap(a.id); } : undefined}>
            <line
              x1={o.x}
              y1={o.y}
              x2={l.x}
              y2={l.y}
              stroke={color}
              strokeWidth={selected ? 0.22 : 0.11}
              strokeLinecap="round"
              opacity={selectedAttack && !selected ? 0.25 : 0.9}
              markerEnd={`url(#arrow-${markerId})`}
            />
            <circle cx={l.x} cy={l.y} r={selected ? 0.28 : 0.18} fill={color} stroke="#fff" strokeWidth={0.04} />
            {onAttackTap && (
              <line x1={o.x} y1={o.y} x2={l.x} y2={l.y} stroke="transparent" strokeWidth={0.7} />
            )}
          </g>
        );
      })}

      {/* Our players */}
      {tokens.map((t) => {
        const p = positionToSvg(t.position);
        return (
          <g
            key={t.id + t.position}
            onPointerUp={
              onTokenTap
                ? (e) => {
                    e.stopPropagation();
                    onTokenTap(t.id);
                  }
                : undefined
            }
            style={{ cursor: onTokenTap ? 'pointer' : undefined }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={1.3}
              fill={t.highlight ? '#1d4ed8' : t.libero ? '#facc15' : '#ffffff'}
              stroke={t.highlight ? '#fff' : '#0f172a'}
              strokeWidth={0.08}
            />
            <text
              x={p.x}
              y={p.y + 0.1}
              textAnchor="middle"
              fontSize={1.1}
              fontWeight={800}
              fill={t.highlight ? '#fff' : '#0f172a'}
            >
              {t.label}
            </text>
            {t.sub && (
              <text x={p.x} y={p.y + 0.85} textAnchor="middle" fontSize={0.45} fontWeight={600} fill={t.highlight ? '#fff' : '#334155'}>
                {t.sub}
              </text>
            )}
            <text x={p.x + 1.05} y={p.y - 1.05} fontSize={0.45} fill="#7c2d12" fontWeight={700}>
              P{t.position}
            </text>
          </g>
        );
      })}
      {/* Draft attack being entered, drawn above the players */}
      <g pointerEvents="none">
      {draft?.origin && (
        <circle {...circleAt(originToSvg(draft.origin))} r={0.45} fill="#1d4ed8" stroke="#fff" strokeWidth={0.08} />
      )}
      {draft?.origin && draft.landing && (
        <line
          x1={originToSvg(draft.origin).x}
          y1={originToSvg(draft.origin).y}
          x2={landingToSvg(draft.landing).x}
          y2={landingToSvg(draft.landing).y}
          stroke="#1d4ed8"
          strokeWidth={0.16}
          strokeDasharray="0.35 0.2"
        />
      )}
      {draft?.landing && (
        <circle
          {...circleAt(landingToSvg(draft.landing))}
          r={0.35}
          fill={isOut(draft.landing) ? '#dc2626' : '#1d4ed8'}
          stroke="#fff"
          strokeWidth={0.08}
        />
      )}

      </g>
    </svg>
  );
}

function circleAt(p: { x: number; y: number }) {
  return { cx: p.x, cy: p.y };
}
