export interface Ausencia {
  id: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  reason?: string;
}

export interface Player {
  id: string;
  name: string;
  phone: string;
  teams: string[];
  position?: string;
  number?: number;
}

export const SAMPLE_PLAYERS: Player[] = [
  { id: 'p1', name: 'Martina Mesejo', phone: '+34600000001', teams: ['cadete-a'] },
  { id: 'p2', name: 'Martina Gómez', phone: '+34600000002', teams: ['cadete-a'] },
  { id: 'p3', name: 'Valeria Yañez', phone: '+34600000003', teams: ['cadete-a'] },
  { id: 'p4', name: 'Carmen Perez', phone: '+34600000004', teams: ['cadete-a'] },
  { id: 'p5', name: 'Lara Nuñez', phone: '+34600000005', teams: ['cadete-a'] },
  { id: 'p6', name: 'Lucia Sexto', phone: '+34600000006', teams: ['cadete-a'] },
  { id: 'p7', name: 'Ana Fachado', phone: '+34600000007', teams: ['cadete-a'] },
  { id: 'p8', name: 'Lola Gantes', phone: '+34600000008', teams: ['cadete-b'] },
  { id: 'p9', name: 'Aitana Pia', phone: '+34600000009', teams: ['cadete-b'] },
];

export interface Team {
  id: string;
  name: string;
  coach: string;
  color: string;
}

export interface Event {
  id: string;
  type: 'training' | 'match';
  teamId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  invitedPlayers: string[];
  confirmedPlayers: string[];
  declinedPlayers: string[];
  notes?: string;
}

export const TEAMS: Team[] = [
  { id: 'infantil-a', name: 'Infantil A', coach: 'Luismi', color: 'hsl(25, 95%, 53%)' },
  { id: 'cadete-b', name: 'Cadete B', coach: 'Carla', color: 'hsl(262, 83%, 58%)' },
  { id: 'cadete-a', name: 'Cadete A', coach: 'Nino', color: 'hsl(142, 76%, 36%)' },
  { id: 'juvenil-a', name: 'Juvenil A', coach: 'Charly', color: 'hsl(199, 89%, 48%)' },
  { id: 'junior', name: 'Junior', coach: 'Charly', color: 'hsl(350, 89%, 60%)' },
  { id: 'primera-nacional', name: 'Primera Nacional', coach: 'Charly', color: 'hsl(45, 93%, 47%)' },
];
