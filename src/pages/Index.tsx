import { Link } from 'react-router-dom';
import { Users, Calendar, UserPlus, CalendarPlus, Trophy, Dumbbell, User, AlertTriangle, ChevronRight, TrendingUp, Crown, Sparkles, Globe, LogOut, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/BottomNav';
import { EventCard } from '@/components/EventCard';
import { NotificationBell } from '@/components/NotificationBell';
import { PlayerOfTheWeek } from '@/components/PlayerOfTheWeek';
import { CreditsDisplay } from '@/components/CreditsDisplay';
import { OnboardingTour } from '@/components/OnboardingTour';
import { CoachWelcomeDialog } from '@/components/CoachWelcomeDialog';
import { MonthlyAbsenceSummary } from '@/components/MonthlyAbsenceSummary';
import { ResponsibilityCodeBanner } from '@/components/ResponsibilityCodeBanner';
import { CoachTeamSelector } from '@/components/CoachTeamSelector';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { useUserRole } from '@/hooks/useUserRole';
import { useClubTheme } from '@/components/ClubThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

export default function Index() {
  const { t, i18n } = useTranslation();
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { events } = useEvents();
  const { profile, isDirector, assignedTeams } = useUserRole();
  const { clubName, logoUrl } = useClubTheme();
  const { unreadCount } = useNotifications();
  const { isPremium, subscription } = useSubscription();
  const { signOut } = useAuth();

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const today = new Date().toISOString().split('T')[0];
  
  // Filter events by assigned teams (unless director)
  // For displacements, check if any of coach's teams are in selected_teams
  const visibleEvents = isDirector || assignedTeams.length === 0
    ? events
    : events.filter(e => {
      if (e.type === 'displacement' && e.selected_teams?.length > 0) {
        return e.selected_teams.some(t => assignedTeams.includes(t));
      }
      return assignedTeams.includes(e.team_id);
    });

  const upcomingEvents = visibleEvents
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const totalMatches = visibleEvents.filter(e => e.type === 'match').length;
  const totalTrainings = visibleEvents.filter(e => e.type === 'training').length;
  
  // Count pending displacements
  const pendingDisplacements = events.filter(e => {
    if (e.type !== 'displacement' || e.date < today) return false;
    
    if (isDirector) {
      // For directors, check if any team hasn't submitted
      return (e.selected_teams || []).some(teamId => {
        const submission = e.coach_submissions?.[teamId];
        return !submission?.submitted;
      });
    } else {
      // For coaches, check their assigned teams
      const myTeamsInEvent = (e.selected_teams || []).filter(tid => 
        assignedTeams.includes(tid)
      );
      return myTeamsInEvent.some(teamId => {
        const submission = e.coach_submissions?.[teamId];
        return !submission?.submitted;
      });
    }
  }).length;
  
  const totalPendingTasks = pendingDisplacements + unreadCount;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pt-8 pb-10">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Club logo" className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold mb-1">{clubName}</h1>
            <p className="text-primary-foreground/80 text-sm">{t('common.manageTeams')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={i18n.language === lang.code ? 'bg-accent' : ''}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NotificationBell />
          <Link to="/profile" data-tour="profile">
            <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>

    {/* Responsibility Code Banner - Very Prominent */}
    <ResponsibilityCodeBanner />

    {/* Coach Team Selector - for coaches to manage their assigned teams */}
    <div className="px-4 mt-4">
      <CoachTeamSelector />
    </div>

    <div className="px-4 -mt-2 space-y-6">
      {/* Premium Upgrade Banner for Free Users */}
      {!isPremium && (
        <Link to="/subscription">
          <Card className="shadow-lg border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{t('subscription.upgradeToPremium')}</p>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('subscription.unlimitedTeams')} • {t('subscription.unlimitedCredits')}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {t('subscription.pricePerMonth', { price: '5€' })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Credits Display for Free Users */}
      {!isPremium && (
        <CreditsDisplay />
      )}

      {/* Pending Tasks Alert */}
      {totalPendingTasks > 0 && (
        <Link to="/pending-tasks">
          <Card className="shadow-lg border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t('common.pendingTasks', { count: totalPendingTasks })}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingDisplacements > 0 && t('displacement.count', { count: pendingDisplacements })}
                    {pendingDisplacements > 0 && unreadCount > 0 && ' · '}
                    {unreadCount > 0 && t('common.notifications', { count: unreadCount })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}
      
      {/* Monthly Absence Summary */}
      <MonthlyAbsenceSummary />

      {/* Weekly Schedule - Google Calendar style */}
      <WeeklySchedule events={visibleEvents} />

      {/* Player of the Week */}
      <PlayerOfTheWeek />
      
      {/* Weekly Summary Link */}
      <Link to="/weekly-summary">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('common.weeklySummary')}</p>
                <p className="text-xs text-muted-foreground">{t('common.teamStats')}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
      {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {isDirector && (
            <Link to="/players">
              <Card className="shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-foreground">{players.length}</p>
                    <p className="text-xs text-muted-foreground">{t('nav.players')}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
          <Link to="/teams">
            <Card className="shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground">{teams.length}</p>
                  <p className="text-xs text-muted-foreground">{t('nav.teams')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          {isDirector && (
            <Link to="/coach-management">
              <Card className="shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-foreground">{t('profile.coachManagement')}</p>
                    <p className="text-xs text-muted-foreground">{t('club.members')}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">{totalMatches} {t('events.matches')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{totalTrainings} {t('events.trainings')}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/players/new">
            <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">{t('players.add')}</span>
            </Button>
          </Link>
          <Link to="/events/new">
            <Button className="w-full h-auto py-4 flex-col gap-2">
              <CalendarPlus className="h-5 w-5" />
              <span className="text-sm">{t('events.create')}</span>
            </Button>
          </Link>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">{t('events.upcoming')}</h2>
            <Link to="/events" className="text-sm text-primary font-medium">
              {t('common.viewAll')}
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">{t('events.noUpcoming')}</p>
                <Link to="/events/new">
                  <Button variant="link" className="mt-2">
                    {t('events.createFirst')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Teams Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">{t('nav.teams')}</h2>
            <Link to="/teams" className="text-sm text-primary font-medium">
              {t('common.viewAll')}
            </Link>
          </div>
          {teamsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {teams.map(team => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="shrink-0"
                >
                  <Card className="w-32 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="h-1.5" style={{ backgroundColor: team.color }} />
                    <CardContent className="p-3">
                      <p className="font-medium text-sm text-foreground truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.coach}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
      <OnboardingTour />
      <CoachWelcomeDialog />
    </div>
  );
}
