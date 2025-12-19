export interface Player {
  id: string;
  name: string;
  phone: string;
  teams: string[];
  position?: string;
  number?: number;
}

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
