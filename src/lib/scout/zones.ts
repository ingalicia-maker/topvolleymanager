import type { Landing, OriginZone, Role } from './types';

// Court geometry, in metres. The chart is drawn with our half at the bottom and the
// opponent's half at the top; "left" is always the left of someone standing behind our baseline.

export const COURT = 9;
export const MARGIN = 1.3;
/** SVG viewBox: 9 m wide plus margins; two halves plus margins high. */
export const VIEW_W = COURT + MARGIN * 2;
export const VIEW_H = COURT * 2 + MARGIN * 2;
export const NET_Y = MARGIN + COURT;

/** Opponent half: landing → SVG coordinates. */
export function landingToSvg(l: Landing): { x: number; y: number } {
  return { x: MARGIN + l.x, y: NET_Y - l.d };
}

export function svgToLanding(x: number, y: number): Landing {
  return { x: round1(x - MARGIN), d: round1(NET_Y - y) };
}

/** Centre of an origin zone on our half, in SVG coordinates. */
export function originToSvg(zone: OriginZone): { x: number; y: number } {
  const col: Record<OriginZone, number> = { 4: 0, 3: 1, 2: 2, 5: 0, 6: 1, 1: 2 };
  const front = zone === 4 || zone === 3 || zone === 2;
  return { x: MARGIN + 1.5 + col[zone] * 3, y: NET_Y + (front ? 1.6 : 6.2) };
}

/** Our positions P1..P6 laid out on our half (index 0 = P1). */
export function positionToSvg(pos: number): { x: number; y: number } {
  const map: Record<number, OriginZone> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  return originToSvg(map[pos]);
}

export function isOut(l: Landing): boolean {
  return l.x < 0 || l.x > COURT || l.d < 0 || l.d > COURT;
}

/**
 * Landing zone on the opponent's court, DataVolley numbering (their zones, seen from our side):
 *   near the net 2·3·4, middle 9·8·7, deep 1·6·5 (left to right).
 * Returns 0 when the ball is out.
 */
export function landingZone(l: Landing): number {
  if (isOut(l)) return 0;
  const col = Math.min(2, Math.floor(l.x / 3));
  const row = Math.min(2, Math.floor(l.d / 3));
  const grid = [
    [2, 3, 4],
    [9, 8, 7],
    [1, 6, 5],
  ];
  return grid[row][col];
}

/** Rectangle of a landing zone in SVG coordinates. */
export function landingZoneRect(zone: number): { x: number; y: number; w: number; h: number } {
  const grid = [
    [2, 3, 4],
    [9, 8, 7],
    [1, 6, 5],
  ];
  for (let row = 0; row < 3; row++) {
    const col = grid[row].indexOf(zone);
    if (col >= 0) return { x: MARGIN + col * 3, y: NET_Y - (row + 1) * 3, w: 3, h: 3 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

export const LANDING_ZONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const ORIGIN_ZONES: OriginZone[] = [4, 3, 2, 5, 6, 1];

/** Usual attack zone for a role: outsides from 4 (pipe from 6 at the back), opposites from 2 (1 at the back). */
export function defaultOrigin(role: Role | undefined, position: number): OriginZone {
  const front = position === 2 || position === 3 || position === 4;
  switch (role) {
    case 'OH':
      return front ? 4 : 6;
    case 'MB':
      return 3;
    case 'OPP':
    case 'S':
      return front ? 2 : 1;
    default:
      return position as OriginZone;
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
