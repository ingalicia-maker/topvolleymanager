import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { useStops } from '@/hooks/useStops';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bus, MapPin, Clock, Users, ChevronDown, ChevronUp, AlertTriangle, Repeat, Shield, Calendar, Info, Bell, CalendarOff, Megaphone } from 'lucide-react';

type EventType = 'training' | 'match' | 'displacement' | 'incident' | 'holiday' | 'communication';

export default function NewEvent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { addEvent, createRecurringEvents } = useEvents();
  const { stops: availableStops, loading: stopsLoading } = useStops();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { notifyPlayerSummoned, notifyDisplacementCreated } = useNotifications();

  const [type, setType] = useState<EventType>('training');
  const [teamId, setTeamId] = useState('');
  
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [time, setTime] = useState(searchParams.get('time') || '');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [invitedPlayers, setInvitedPlayers] = useState<string[]>([]);
  const [playerTab, setPlayerTab] = useState('team');
  const [loading, setLoading] = useState(false);
  const [expandedOtherTeams, setExpandedOtherTeams] = useState<string[]>([]);

  // Match-specific state
  const [opponent, setOpponent] = useState('');

  // Displacement-specific state
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [totalCoaches, setTotalCoaches] = useState('1');
  
  // Notification event state (for incident, holiday, communication)
  const [affectedTeams, setAffectedTeams] = useState<string[]>([]);
  const [affectsAllTeams, setAffectsAllTeams] = useState(true);

  // Recurring and persistence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly'>('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [keepForever, setKeepForever] = useState(false);

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Generate time options in 15-minute increments (5:00 - 23:45)
  const timeOptions: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  // For standard events
  const selectedTeam = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId));
  const otherPlayers = players.filter(p => !p.teams?.includes(teamId));
  
  // Group other players by their teams (excluding the selected team)
  const otherTeams = teams.filter(t => t.id !== teamId);
  const getPlayersForOtherTeam = (otherTeamId: string) => 
    players.filter(p => p.teams?.includes(otherTeamId) && !p.teams?.includes(teamId));
  
  const toggleOtherTeamExpand = (otherTeamId: string) => {
    setExpandedOtherTeams(prev =>
      prev.includes(otherTeamId) ? prev.filter(id => id !== otherTeamId) : [...prev, otherTeamId]
    );
  };
  
  const selectAllFromOtherTeam = (otherTeamId: string) => {
    const teamPlayerIds = getPlayersForOtherTeam(otherTeamId).map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutThisTeam = prev.filter(id => !teamPlayerIds.includes(id));
      return [...withoutThisTeam, ...teamPlayerIds];
    });
  };
  
  const deselectAllFromOtherTeam = (otherTeamId: string) => {
    const teamPlayerIds = getPlayersForOtherTeam(otherTeamId).map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !teamPlayerIds.includes(id)));
  };
  
  const isAllOtherTeamSelected = (otherTeamId: string) => {
    const teamPlayerIds = getPlayersForOtherTeam(otherTeamId);
    return teamPlayerIds.length > 0 && teamPlayerIds.every(p => invitedPlayers.includes(p.id));
  };
  
  const getSelectedCountFromOtherTeam = (otherTeamId: string) => {
    const teamPlayerIds = getPlayersForOtherTeam(otherTeamId).map(p => p.id);
    return teamPlayerIds.filter(id => invitedPlayers.includes(id)).length;
  };

  const togglePlayer = (playerId: string) => {
    setInvitedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleStop = (stop: string) => {
    setSelectedStops(prev =>
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
  };

  const toggleTeamForDisplacement = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const selectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutTeam = prev.filter(id => !teamPlayerIds.includes(id));
      return [...withoutTeam, ...teamPlayerIds];
    });
  };

  const deselectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !teamPlayerIds.includes(id)));
  };

  const selectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutOther = prev.filter(id => !otherPlayerIds.includes(id));
      return [...withoutOther, ...otherPlayerIds];
    });
  };

  const deselectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !otherPlayerIds.includes(id)));
  };

  const allTeamSelected = teamPlayers.length > 0 && teamPlayers.every(p => invitedPlayers.includes(p.id));
  const allOtherSelected = otherPlayers.length > 0 && otherPlayers.every(p => invitedPlayers.includes(p.id));

  const getEventTitle = () => {
    switch (type) {
      case 'training': return t('events.training');
      case 'match': return t('events.match');
      case 'displacement': return t('events.displacement');
      case 'incident': return t('events.incident');
      case 'holiday': return t('events.holiday');
      case 'communication': return t('events.communication');
      default: return t('events.title');
    }
  };

  const isNotificationType = type === 'incident' || type === 'holiday' || type === 'communication';

  const toggleAffectedTeam = (teamId: string) => {
    setAffectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNotificationType && type !== 'displacement' && !teamId) {
      toast.error(t('events.selectTeamError'));
      return;
    }
    if (!date) {
      toast.error(t('events.dateRequiredError'));
      return;
    }

    if (type === 'displacement') {
      if (!destination.trim()) {
        toast.error(t('events.destinationRequiredError'));
        return;
      }
      if (!departureTime) {
        toast.error(t('events.departureTimeRequiredError'));
        return;
      }
      if (selectedTeams.length === 0) {
        toast.error(t('events.selectAtLeastOneTeamError'));
        return;
      }
    } else if (isNotificationType) {
      // Notification types: incident, holiday, communication
      if (!affectsAllTeams && affectedTeams.length === 0) {
        toast.error(t('events.selectAffectedTeamError'));
        return;
      }
      if (!notes.trim()) {
        toast.error(t('events.describeNotificationError'));
        return;
      }
    } else {
      if (!time) {
        toast.error(t('events.timeRequiredError'));
        return;
      }
      if (!location.trim()) {
        toast.error(t('events.locationRequiredError'));
        return;
      }
    }

    setLoading(true);
    
    // For displacement events, initialize coach_submissions for each team
    const coachSubmissions: Record<string, { coach_id: string; coach_name: string; submitted: boolean; submitted_at: string | null }> = {};
    if (type === 'displacement') {
      for (const tId of selectedTeams) {
        coachSubmissions[tId] = {
          coach_id: '',
          coach_name: '',
          submitted: false,
          submitted_at: null,
        };
      }
    }

    const result = await addEvent({
      type,
      team_id: isNotificationType 
        ? (affectsAllTeams ? 'all' : affectedTeams[0] || 'all')
        : type === 'displacement' 
          ? selectedTeams[0] 
          : teamId,
      title: getEventTitle(),
      date,
      time: isNotificationType 
        ? (time || '00:00')
        : type === 'displacement' 
          ? departureTime 
          : time,
      location: isNotificationType 
        ? (location.trim() || '-')
        : type === 'displacement' 
          ? destination.trim() 
          : location.trim(),
      invited_players: type === 'displacement' || isNotificationType ? [] : invitedPlayers,
      confirmed_players: [],
      declined_players: [],
      notes: notes.trim() || null,
      created_by: user?.id || null,
      destination: type === 'displacement' ? destination.trim() : null,
      departure_time: type === 'displacement' ? departureTime : null,
      stops: type === 'displacement' ? selectedStops : [],
      player_stops: {},
      player_returns: {},
      total_passengers: type === 'displacement' ? parseInt(totalCoaches) || 0 : null,
      selected_teams: isNotificationType 
        ? (affectsAllTeams ? teams.map(t => t.id) : affectedTeams)
        : type === 'displacement' 
          ? selectedTeams 
          : [],
      coach_submissions: coachSubmissions,
      keep_forever: keepForever,
      is_recurring: isRecurring,
      recurring_pattern: isRecurring ? recurringPattern : null,
      recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
      parent_event_id: null,
      opponent: type === 'match' && opponent.trim() ? opponent.trim() : null,
    });

    if (result) {
      // Notify coaches when displacement is created
      if (type === 'displacement') {
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, name, assigned_teams');

        if (coaches) {
          const senderName = profile?.name || 'Un director';
          
          for (const coach of coaches) {
            if (coach.id === user?.id) continue;
            
            const coachTeams = coach.assigned_teams || [];
            const hasTeamInDisplacement = coachTeams.some((t: string) => selectedTeams.includes(t));
            
            if (hasTeamInDisplacement) {
              await notifyDisplacementCreated(
                coach.id,
                senderName,
                destination.trim(),
                date,
                result.id
              );
            }
          }
        }
      } else {
        // Notify coaches of players from other teams (for standard events)
        const otherTeamPlayers = players.filter(
          p => invitedPlayers.includes(p.id) && !p.teams?.includes(teamId)
        );

        if (otherTeamPlayers.length > 0) {
          const affectedTeamIds = new Set<string>();
          otherTeamPlayers.forEach(p => {
            p.teams?.forEach(t => {
              if (t !== teamId) affectedTeamIds.add(t);
            });
          });

          const { data: coaches } = await supabase
            .from('profiles')
            .select('id, assigned_teams');

          if (coaches) {
            const senderName = profile?.name || 'Un entrenador';
            
            for (const coach of coaches) {
              if (coach.id === user?.id) continue;
              
              const coachTeams = coach.assigned_teams || [];
              const matchingTeams = coachTeams.filter((t: string) => affectedTeamIds.has(t));
              
              if (matchingTeams.length > 0) {
                const summonedFromCoach = otherTeamPlayers.filter(p =>
                  p.teams?.some(t => matchingTeams.includes(t))
                );

                for (const player of summonedFromCoach) {
                  await notifyPlayerSummoned(
                    coach.id,
                    senderName,
                    player.name,
                    result.title,
                    player.id,
                    result.id
                  );
                }
              }
            }
          }
        }
      }

      // Create recurring events if enabled
      if (isRecurring && type === 'training') {
        await createRecurringEvents(result, recurringPattern, recurringEndDate || undefined);
      }

      navigate(`/events/${result.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('events.newEvent')} showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="type">{t('events.eventType')}</Label>
          <select
            id="type"
            className={nativeSelectClassName}
            value={type}
            onChange={(e) => {
              setType(e.target.value as EventType);
              if (e.target.value !== 'displacement') {
                setSelectedTeams([]);
              }
              if (!['incident', 'holiday', 'communication'].includes(e.target.value)) {
                setAffectedTeams([]);
                setAffectsAllTeams(true);
              }
            }}
            disabled={loading}
          >
            <optgroup label={t('events.activitiesGroup')}>
              <option value="training">🏐 {t('events.training')}</option>
              <option value="match">🏆 {t('events.match')}</option>
              <option value="displacement">🚌 {t('events.displacement')}</option>
            </optgroup>
            <optgroup label={t('events.notificationsGroup')}>
              <option value="incident">⚠️ {t('events.incident')}</option>
              <option value="holiday">🎉 {t('events.holiday')}</option>
              <option value="communication">📢 {t('events.communication')}</option>
            </optgroup>
          </select>
        </div>

        {type === 'displacement' ? (
          <>
            {/* DISPLACEMENT FLOW: Step 1 - Destination and time */}
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('events.destination')} *
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder={t('events.destinationPlaceholder')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t('events.date')} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('events.departureTimeLabel')} *
              </Label>
              <select
                id="departureTime"
                className={nativeSelectClassName}
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  {t('events.selectTime')}
                </option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* DISPLACEMENT FLOW: Step 2 - Stops */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  {t('events.busStopsOptional')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stopsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : availableStops.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('events.noStopsConfiguredGoSettings')}
                  </p>
                ) : (
                  availableStops.map(stop => (
                    <label
                      key={stop.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStops.includes(stop.name) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedStops.includes(stop.name)}
                        onCheckedChange={() => toggleStop(stop.name)}
                        disabled={loading}
                      />
                      <span className="font-medium">{stop.name}</span>
                    </label>
                  ))
                )}
              </CardContent>
            </Card>

            {/* DISPLACEMENT FLOW: Step 3 - Teams */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('events.travelingTeams')} *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {teams.map(team => {
                      const teamPlayerCount = players.filter(p => p.teams?.includes(team.id)).length;
                      return (
                        <label
                          key={team.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTeams.includes(team.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={selectedTeams.includes(team.id)}
                            onCheckedChange={() => toggleTeamForDisplacement(team.id)}
                            disabled={loading}
                          />
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{team.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({t('events.playersCountLabel', { count: teamPlayerCount })})
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Number of coaches */}
            <div className="space-y-2">
              <Label htmlFor="totalCoaches" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('events.numberOfCoaches')}
              </Label>
              <Input
                id="totalCoaches"
                type="number"
                min="0"
                value={totalCoaches}
                onChange={e => setTotalCoaches(e.target.value)}
                disabled={loading}
              />
            </div>

            {selectedTeams.length > 0 && (
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm text-blue-700 font-medium">
                    ℹ️ {t('events.afterCreatingDisplacementInfo')}
                  </p>
                  <p className="text-xs text-blue-600">
                    {t('events.selectedTeamsLabel', { teams: selectedTeams.map(t => teams.find(tm => tm.id === t)?.name).join(', ') })}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : isNotificationType ? (
          <>
            {/* NOTIFICATION EVENT FLOW (incident, holiday, communication) */}
            <Card className={`border-2 ${type === 'incident' ? 'border-orange-500/50 bg-orange-500/5' : type === 'holiday' ? 'border-green-500/50 bg-green-500/5' : 'border-blue-500/50 bg-blue-500/5'}`}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  {type === 'incident' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                  {type === 'holiday' && <CalendarOff className="h-5 w-5 text-green-600" />}
                  {type === 'communication' && <Megaphone className="h-5 w-5 text-blue-600" />}
                  <span className="font-medium">
                    {type === 'incident' && t('events.incidentTitle')}
                    {type === 'holiday' && t('events.holidayTitle')}
                    {type === 'communication' && t('events.communicationTitle')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {type === 'incident' && t('events.incidentDesc')}
                  {type === 'holiday' && t('events.holidayDesc')}
                  {type === 'communication' && t('events.communicationDesc')}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="date">{t('events.date')} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">{t('events.timeOptional')}</Label>
              <select
                id="time"
                className={nativeSelectClassName}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={loading}
              >
                <option value="">{t('events.allDay')}</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('events.affectedLocationOptional')}</Label>
              <Input
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={t('events.affectedLocationPlaceholder')}
                disabled={loading}
              />
            </div>

            {/* Team selector for notifications */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('events.affectedTeamsLabel')} *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="affectsAll"
                    checked={affectsAllTeams}
                    onChange={() => setAffectsAllTeams(true)}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{t('events.allTeams')}</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="affectsAll"
                    checked={!affectsAllTeams}
                    onChange={() => setAffectsAllTeams(false)}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{t('events.someTeamsOnly')}</span>
                </label>

                {!affectsAllTeams && (
                  <div className="pl-4 space-y-2 border-l-2 border-muted">
                    {teamsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      teams.map(team => (
                        <label
                          key={team.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                            affectedTeams.includes(team.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={affectedTeams.includes(team.id)}
                            onCheckedChange={() => toggleAffectedTeam(team.id)}
                            disabled={loading}
                          />
                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="font-medium">{team.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t('events.descriptionLabel')} *
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={
                  type === 'incident'
                    ? t('events.incidentPlaceholder')
                    : type === 'holiday'
                    ? t('events.holidayPlaceholder')
                    : t('events.communicationPlaceholder')
                }
                rows={3}
                disabled={loading}
              />
            </div>
          </>
        ) : (
          <>
            {/* STANDARD EVENT FLOW */}
            <div className="space-y-2">
              <Label htmlFor="teamId">{t('events.teamLabel')} *</Label>
              {teamsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <select
                  id="teamId"
                  className={nativeSelectClassName}
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loading}
                >
                  <option value="" disabled>
                    {t('events.selectTeamPlaceholder')}
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t('events.date')} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">{t('events.time')} *</Label>
              <select
                id="time"
                className={nativeSelectClassName}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  {t('events.selectTime')}
                </option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('events.locationLabelRequired')} *</Label>
              <Input
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={t('events.locationPlaceholder')}
                disabled={loading}
              />
            </div>

            {/* Opponent field - only for matches */}
            {type === 'match' && (
              <div className="space-y-2">
                <Label htmlFor="opponent">{t('events.opponentOptional')}</Label>
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={e => setOpponent(e.target.value)}
                  placeholder={t('events.opponentPlaceholder')}
                  disabled={loading}
                />
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">{t('events.notes')}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('events.additionalInfoPlaceholder')}
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Recurring event options - only for training */}
        {type === 'training' && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                {t('events.recurringEvent')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                  disabled={loading}
                />
                <span className="text-sm">{t('events.repeatAutomatically')}</span>
              </label>

              {isRecurring && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurringPattern">{t('events.frequency')}</Label>
                    <select
                      id="recurringPattern"
                      className={nativeSelectClassName}
                      value={recurringPattern}
                      onChange={(e) => setRecurringPattern(e.target.value as 'weekly' | 'biweekly')}
                      disabled={loading}
                    >
                      <option value="weekly">{t('events.everyWeek')}</option>
                      <option value="biweekly">{t('events.everyTwoWeeks')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurringEndDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('events.untilOptional')}
                    </Label>
                    <Input
                      id="recurringEndDate"
                      type="date"
                      value={recurringEndDate}
                      onChange={e => setRecurringEndDate(e.target.value)}
                      min={date}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('events.noEndDateHint')}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auto-deletion warning and keep forever option */}
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t('events.autoDeleteTitle')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('events.autoDeleteDesc')}
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white dark:bg-background border border-amber-200 dark:border-amber-700">
              <Checkbox
                checked={keepForever}
                onCheckedChange={(checked) => setKeepForever(checked === true)}
                disabled={loading}
              />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('events.keepForeverLabel')}</span>
              </div>
            </label>

            {keepForever && (
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                ✓ {t('events.keepForeverConfirmed')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Player selection for standard events only */}
        {type !== 'displacement' && teamId && (
          <div className="space-y-3">
            <Label>{t('events.summonPlayers', { count: invitedPlayers.length })}</Label>

            <div className="w-full">
              <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  type="button"
                  className={
                    "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (playerTab === 'team'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground')
                  }
                  onClick={() => setPlayerTab('team')}
                  disabled={loading}
                >
                  {selectedTeam?.name} ({teamPlayers.length})
                </button>
                <button
                  type="button"
                  className={
                    "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (playerTab === 'other'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground')
                  }
                  onClick={() => setPlayerTab('other')}
                  disabled={loading}
                >
                  {t('events.otherPlayersTab', { count: otherPlayers.length })}
                </button>
              </div>

              {playerTab === 'team' ? (
                <div className="mt-3 space-y-2">
                  {teamPlayers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t('events.noPlayersInTeam')}
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={allTeamSelected ? deselectAllTeam : selectAllTeam}
                          disabled={loading}
                        >
                          {allTeamSelected ? t('events.removeAll') : t('events.selectAllPlayers')}
                        </Button>
                      </div>
                      {teamPlayers.map((player) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          selectable
                          selected={invitedPlayers.includes(player.id)}
                          onSelect={togglePlayer}
                          showTeams={false}
                          clickable={false}
                        />
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {otherTeams.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t('events.noOtherTeams')}
                    </p>
                  ) : (
                    otherTeams.map((team) => {
                      const teamOtherPlayers = getPlayersForOtherTeam(team.id);
                      const isExpanded = expandedOtherTeams.includes(team.id);
                      const selectedCount = getSelectedCountFromOtherTeam(team.id);
                      const allSelected = isAllOtherTeamSelected(team.id);
                      
                      if (teamOtherPlayers.length === 0) return null;
                      
                      return (
                        <Card key={team.id} className="overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                            onClick={() => toggleOtherTeamExpand(team.id)}
                            disabled={loading}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="font-medium">{team.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({t('events.playersCountLabel', { count: teamOtherPlayers.length })})
                              </span>
                              {selectedCount > 0 && (
                                <Badge variant="default" className="ml-1">
                                  {t('events.selectedCount', { count: selectedCount })}
                                </Badge>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          {isExpanded && (
                            <CardContent className="pt-0 pb-3 px-3 space-y-2">
                              <div className="flex justify-end mb-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => allSelected ? deselectAllFromOtherTeam(team.id) : selectAllFromOtherTeam(team.id)}
                                  disabled={loading}
                                >
                                  {allSelected ? t('events.removeAll') : t('events.selectAllPlayers')}
                                </Button>
                              </div>
                              {teamOtherPlayers.map((player) => (
                                <PlayerCard
                                  key={player.id}
                                  player={player}
                                  selectable
                                  selected={invitedPlayers.includes(player.id)}
                                  onSelect={togglePlayer}
                                  showTeams={false}
                                  clickable={false}
                                />
                              ))}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('events.creating') : type === 'displacement' ? t('events.createDisplacement') : t('events.create')}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
