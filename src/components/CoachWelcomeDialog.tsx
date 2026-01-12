import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Star, Users, PartyPopper } from 'lucide-react';
import { useClubTheme } from '@/components/ClubThemeProvider';

const COACH_WELCOME_SHOWN_KEY = 'coach_welcome_shown';
const NEW_COACH_FLAG_KEY = 'is_new_coach';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; path: string };
}

export function CoachWelcomeDialog() {
  const { t, i18n } = useTranslation();
  const { clubName } = useClubTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const lang = i18n.language || 'es';

  useEffect(() => {
    const isNewCoach = localStorage.getItem(NEW_COACH_FLAG_KEY);
    const alreadyShown = localStorage.getItem(COACH_WELCOME_SHOWN_KEY);

    if (isNewCoach === 'true' && !alreadyShown) {
      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.removeItem(NEW_COACH_FLAG_KEY);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(COACH_WELCOME_SHOWN_KEY, 'true');
    setOpen(false);
  };

  const handleAction = (path: string) => {
    localStorage.setItem(COACH_WELCOME_SHOWN_KEY, 'true');
    setOpen(false);
    navigate(path);
  };

  const steps: Step[] = lang === 'es' ? [
    {
      icon: <Calendar className="h-5 w-5 text-primary" />,
      title: 'Consulta los eventos',
      description: 'Revisa los próximos entrenamientos y partidos programados para tu equipo.',
      action: { label: 'Ver eventos', path: '/events' },
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: 'Conoce a tus jugadoras',
      description: 'Accede a las fichas de tus jugadoras, contactos y estadísticas.',
      action: { label: 'Ver equipo', path: '/teams' },
    },
    {
      icon: <Star className="h-5 w-5 text-primary" />,
      title: 'Valora el rendimiento',
      description: 'Después de cada sesión, valora a tus jugadoras para hacer seguimiento.',
      action: { label: 'Valoraciones', path: '/ratings' },
    },
  ] : lang === 'it' ? [
    {
      icon: <Calendar className="h-5 w-5 text-primary" />,
      title: 'Consulta gli eventi',
      description: 'Controlla i prossimi allenamenti e partite programmate per la tua squadra.',
      action: { label: 'Vedi eventi', path: '/events' },
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: 'Conosci le tue giocatrici',
      description: 'Accedi alle schede delle tue giocatrici, contatti e statistiche.',
      action: { label: 'Vedi squadra', path: '/teams' },
    },
    {
      icon: <Star className="h-5 w-5 text-primary" />,
      title: 'Valuta le prestazioni',
      description: 'Dopo ogni sessione, valuta le tue giocatrici per monitorare i progressi.',
      action: { label: 'Valutazioni', path: '/ratings' },
    },
  ] : [
    {
      icon: <Calendar className="h-5 w-5 text-primary" />,
      title: 'Check upcoming events',
      description: 'Review scheduled trainings and matches for your team.',
      action: { label: 'View events', path: '/events' },
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: 'Meet your players',
      description: 'Access player profiles, contacts and statistics.',
      action: { label: 'View team', path: '/teams' },
    },
    {
      icon: <Star className="h-5 w-5 text-primary" />,
      title: 'Rate performance',
      description: 'After each session, rate your players to track their progress.',
      action: { label: 'Ratings', path: '/ratings' },
    },
  ];

  const headingText = lang === 'es'
    ? `¡Te has unido a ${clubName}!`
    : lang === 'it'
    ? `Ti sei unito a ${clubName}!`
    : `You've joined ${clubName}!`;

  const subtitleText = lang === 'es'
    ? 'Bienvenido al equipo. Aquí tienes los primeros pasos para empezar:'
    : lang === 'it'
    ? 'Benvenuto nella squadra. Ecco i primi passi per iniziare:'
    : 'Welcome to the team. Here are the first steps to get started:';

  const closeLabel = lang === 'es' ? 'Entendido' : lang === 'it' ? 'Capito' : 'Got it';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <PartyPopper className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">{headingText}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {subtitleText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {step.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleAction(step.action!.path)}
                >
                  {step.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function triggerCoachWelcome() {
  localStorage.setItem(NEW_COACH_FLAG_KEY, 'true');
  localStorage.removeItem(COACH_WELCOME_SHOWN_KEY);
}
