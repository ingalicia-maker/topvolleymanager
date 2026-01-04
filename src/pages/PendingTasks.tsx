import { Link } from 'react-router-dom';
import { Bus, Bell, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserRole } from '@/hooks/useUserRole';
import { useTeams } from '@/hooks/useTeams';

interface PendingTask {
  id: string;
  type: 'displacement' | 'notification';
  title: string;
  description: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
  eventDate?: string;
}

export default function PendingTasks() {
  const { events } = useEvents();
  const { notifications, unreadCount } = useNotifications();
  const { profile, isDirector, assignedTeams } = useUserRole();
  const { teams } = useTeams();
  
  const today = new Date().toISOString().split('T')[0];

  // Get pending displacements for this coach
  const getPendingDisplacements = (): PendingTask[] => {
    if (!profile?.id) return [];
    
    const upcomingDisplacements = events.filter(e => 
      e.type === 'displacement' && 
      e.date >= today
    );
    
    const pending: PendingTask[] = [];
    
    for (const event of upcomingDisplacements) {
      // For directors, check if any team hasn't submitted
      if (isDirector) {
        const teamsWithoutSubmission = (event.selected_teams || []).filter(teamId => {
          const submission = event.coach_submissions?.[teamId];
          return !submission?.submitted;
        });
        
        if (teamsWithoutSubmission.length > 0) {
          const teamNames = teamsWithoutSubmission
            .map(tid => teams.find(t => t.id === tid)?.name || 'Equipo')
            .join(', ');
          
          pending.push({
            id: `displacement-${event.id}`,
            type: 'displacement',
            title: `Desplazamiento: ${event.destination || event.title}`,
            description: `Falta completar lista de: ${teamNames}`,
            link: `/events/${event.id}`,
            priority: 'high',
            eventDate: event.date,
          });
        }
      } else {
        // For coaches, check their assigned teams
        const myTeamsInEvent = (event.selected_teams || []).filter(tid => 
          assignedTeams.includes(tid)
        );
        
        for (const teamId of myTeamsInEvent) {
          const submission = event.coach_submissions?.[teamId];
          if (!submission?.submitted) {
            const teamName = teams.find(t => t.id === teamId)?.name || 'Tu equipo';
            pending.push({
              id: `displacement-${event.id}-${teamId}`,
              type: 'displacement',
              title: `Desplazamiento: ${event.destination || event.title}`,
              description: `Completa la lista de ${teamName}`,
              link: `/events/${event.id}`,
              priority: 'high',
              eventDate: event.date,
            });
          }
        }
      }
    }
    
    return pending;
  };
  
  // Get unread notifications as tasks
  const getNotificationTasks = (): PendingTask[] => {
    return notifications
      .filter(n => !n.is_read)
      .map(n => ({
        id: `notification-${n.id}`,
        type: 'notification' as const,
        title: n.title,
        description: n.message,
        link: n.related_event_id ? `/events/${n.related_event_id}` : '/events',
        priority: 'medium' as const,
      }));
  };
  
  const displacementTasks = getPendingDisplacements();
  const notificationTasks = getNotificationTasks();
  const allTasks = [...displacementTasks, ...notificationTasks];
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Tareas Pendientes" showBack />
      
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Bus className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displacementTasks.length}</p>
                <p className="text-xs text-muted-foreground">Desplazamientos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Notificaciones</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {allTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-1">¡Todo al día!</h3>
              <p className="text-muted-foreground text-sm">
                No tienes tareas pendientes en este momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Displacement Tasks */}
            {displacementTasks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  Desplazamientos sin completar
                </h2>
                <div className="space-y-2">
                  {displacementTasks.map(task => (
                    <Link key={task.id} to={task.link}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                <span className="font-medium text-sm truncate">{task.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                              {task.eventDate && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.eventDate)}
                                </div>
                              )}
                            </div>
                            <Badge variant="destructive" className="shrink-0">Urgente</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notification Tasks */}
            {notificationTasks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificaciones sin leer
                </h2>
                <div className="space-y-2">
                  {notificationTasks.map(task => (
                    <Link key={task.id} to={task.link}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm">{task.title}</span>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">Pendiente</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
