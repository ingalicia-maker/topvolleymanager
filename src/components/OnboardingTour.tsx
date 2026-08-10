import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, ChevronLeft, Users, Calendar, Settings, Star, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export function OnboardingTour() {
  const { t, i18n } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      id: 'teams',
      targetSelector: '[data-tour="teams"]',
      title: i18n.language === 'es' ? '¡Crea tu primer equipo!' : i18n.language === 'it' ? 'Crea la tua prima squadra!' : 'Create your first team!',
      description: i18n.language === 'es' 
        ? 'Empieza añadiendo los equipos de tu club. Podrás asignar un entrenador y color a cada uno.'
        : i18n.language === 'it'
        ? 'Inizia aggiungendo le squadre del tuo club. Potrai assegnare un allenatore e un colore a ciascuna.'
        : 'Start by adding your club teams. You can assign a coach and color to each one.',
      icon: <Calendar className="h-5 w-5" />,
      position: 'bottom',
    },
    {
      id: 'players',
      targetSelector: '[data-tour="players"]',
      title: i18n.language === 'es' ? 'Añade jugadoras' : i18n.language === 'it' ? 'Aggiungi giocatrici' : 'Add players',
      description: i18n.language === 'es' 
        ? 'Registra a las jugadoras de tu club con sus datos, fotos y asígnalas a sus equipos.'
        : i18n.language === 'it'
        ? 'Registra le giocatrici del tuo club con i loro dati, foto e assegnale alle squadre.'
        : 'Register your club players with their data, photos and assign them to teams.',
      icon: <Users className="h-5 w-5" />,
      position: 'bottom',
    },
    {
      id: 'events',
      targetSelector: '[data-tour="profile"]',
      title: i18n.language === 'es' ? 'Crea eventos' : i18n.language === 'it' ? 'Crea eventi' : 'Create events',
      description: i18n.language === 'es' 
        ? 'Programa entrenamientos, partidos y torneos. Las jugadoras podrán confirmar su asistencia.'
        : i18n.language === 'it'
        ? 'Programma allenamenti, partite e tornei. Le giocatrici potranno confermare la loro presenza.'
        : 'Schedule trainings, matches and tournaments. Players can confirm their attendance.',
      icon: <Calendar className="h-5 w-5" />,
      position: 'bottom',
    },
    {
      id: 'ratings',
      targetSelector: '[data-tour="ratings"]',
      title: i18n.language === 'es' ? 'Valora el rendimiento' : i18n.language === 'it' ? 'Valuta le prestazioni' : 'Rate performance',
      description: i18n.language === 'es' 
        ? 'Evalúa a tus jugadoras después de cada entrenamiento o partido para hacer seguimiento de su evolución.'
        : i18n.language === 'it'
        ? 'Valuta le tue giocatrici dopo ogni allenamento o partita per monitorare la loro evoluzione.'
        : 'Rate your players after each training or match to track their progress.',
      icon: <Star className="h-5 w-5" />,
      position: 'bottom',
    },
    {
      id: 'profile',
      targetSelector: '[data-tour="profile"]',
      title: i18n.language === 'es' ? 'Gestiona tu club' : i18n.language === 'it' ? 'Gestisci il tuo club' : 'Manage your club',
      description: i18n.language === 'es' 
        ? 'Desde el perfil puedes invitar entrenadores, configurar el club, gestionar paradas de bus y mucho más.'
        : i18n.language === 'it'
        ? 'Dal profilo puoi invitare allenatori, configurare il club, gestire fermate bus e molto altro.'
        : 'From your profile you can invite coaches, configure the club, manage bus stops and much more.',
      icon: <Settings className="h-5 w-5" />,
      position: 'left',
    },
  ];

  useEffect(() => {
    // Check if onboarding has been completed
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    const isNewDirector = localStorage.getItem('is_new_director');
    
    if (!completed && isNewDirector === 'true') {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setIsActive(true);
        localStorage.removeItem('is_new_director');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const updateTargetPosition = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [isActive, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsActive(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsActive(false);
  };

  if (!isActive || !targetRect) return null;

  const step = steps[currentStep];
  
  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 12;
    const arrowSize = 10;
    
    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.bottom + padding + arrowSize,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316)),
          width: 300,
          zIndex: 10001,
        };
      case 'top':
        return {
          position: 'fixed',
          bottom: window.innerHeight - targetRect.top + padding + arrowSize,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316)),
          width: 300,
          zIndex: 10001,
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - 80,
          right: window.innerWidth - targetRect.left + padding + arrowSize,
          width: 300,
          zIndex: 10001,
        };
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - 80,
          left: targetRect.right + padding + arrowSize,
          width: 300,
          zIndex: 10001,
        };
      default:
        return {};
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (step.position) {
      case 'bottom':
        return {
          ...baseStyle,
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 10px 10px 10px',
          borderColor: 'transparent transparent hsl(var(--card)) transparent',
        };
      case 'top':
        return {
          ...baseStyle,
          bottom: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '10px 10px 0 10px',
          borderColor: 'hsl(var(--card)) transparent transparent transparent',
        };
      case 'left':
        return {
          ...baseStyle,
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 0 10px 10px',
          borderColor: 'transparent transparent transparent hsl(var(--card))',
        };
      case 'right':
        return {
          ...baseStyle,
          left: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 10px 10px 0',
          borderColor: 'transparent hsl(var(--card)) transparent transparent',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[10000]"
        onClick={handleSkip}
      />
      
      {/* Highlight circle around target */}
      <div
        className="fixed z-[10000] rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Tooltip */}
      <Card className="shadow-2xl border-primary/20" style={getTooltipStyle()}>
        {/* Arrow */}
        <div style={getArrowStyle()} />
        
        <CardContent className="p-4">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-3">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'w-6 bg-primary' 
                    : idx < currentStep 
                    ? 'w-1.5 bg-primary/50' 
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {i18n.language === 'es' ? 'Anterior' : i18n.language === 'it' ? 'Precedente' : 'Previous'}
            </Button>
            
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              {currentStep === steps.length - 1 
                ? (i18n.language === 'es' ? '¡Empezar!' : i18n.language === 'it' ? 'Inizia!' : 'Start!')
                : (i18n.language === 'es' ? 'Siguiente' : i18n.language === 'it' ? 'Avanti' : 'Next')
              }
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function useOnboardingTour() {
  const triggerTour = () => {
    localStorage.setItem('is_new_director', 'true');
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  };

  const resetTour = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.setItem('is_new_director', 'true');
    window.location.reload();
  };

  return { triggerTour, resetTour };
}
