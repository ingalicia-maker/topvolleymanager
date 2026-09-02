import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Users,
  CalendarPlus,
  Dumbbell,
  AlertTriangle,
  Star,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { CoachTeamSelector } from '@/components/CoachTeamSelector';
import { Card, CardContent } from '@/components/ui/card';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';

export default function CoachHub() {
  const { t } = useTranslation();
  const { teams } = useTeams();
  const { isDirector, assignedTeams } = useUserRole();

  const myTeams =
    isDirector || assignedTeams.length === 0
      ? teams
      : teams.filter((team) => assignedTeams.includes(team.id));

  const actions = [
    { to: '/events', icon: Calendar, title: t('coachHub.trainings'), subtitle: t('coachHub.trainingsDesc') },
    { to: '/events/new', icon: CalendarPlus, title: t('events.create'), subtitle: t('coachHub.createEventDesc') },
    { to: '/exercises', icon: Dumbbell, title: t('exercises.title'), subtitle: t('exercises.subtitle') },
    { to: '/ausencias', icon: AlertTriangle, title: t('nav.absences'), subtitle: t('coachHub.absencesDesc') },
    { to: '/ratings', icon: Star, title: t('nav.ratings'), subtitle: t('coachHub.ratingsDesc') },
    { to: '/weekly-summary', icon: TrendingUp, title: t('common.weeklySummary'), subtitle: t('common.teamStats') },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div
        className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pt-8 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h1 className="text-2xl font-bold">{t('coachHub.title')}</h1>
        <p className="text-primary-foreground/80 text-sm">{t('coachHub.subtitle')}</p>
      </div>

      <div className="px-4 mt-4 space-y-6">
        <CoachTeamSelector />

        <section>
          <h2 className="font-bold text-foreground mb-3">{t('coachHub.myTeams')}</h2>
          {myTeams.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {t('coachHub.noTeams')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myTeams.map((team) => (
                <Link key={team.id} to={`/teams/${team.id}`}>
                  <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden mb-3">
                    <div className="h-1.5" style={{ backgroundColor: team.color }} />
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.coach}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-foreground mb-3">{t('coachHub.management')}</h2>
          <div className="space-y-3">
            {actions.map((action) => (
              <Link key={action.to} to={action.to}>
                <Card className="shadow-sm hover:shadow-md transition-shadow mb-3">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                        <action.icon className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
