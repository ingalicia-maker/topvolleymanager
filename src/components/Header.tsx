import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useClubTheme } from './ClubThemeProvider';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  backTo?: string;
}

export function Header({ title, showBack = false, rightAction, onBack, backTo }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoUrl } = useClubTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      // Check if we have history to go back to
      // If referrer is same origin or we have state, use navigate(-1)
      // Otherwise fallback to home
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-3 px-4">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 min-h-11 min-w-11"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        {logoUrl && !showBack && (
          <img src={logoUrl} alt="Club logo" className="h-8 w-8 object-contain" />
        )}
        <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
        {rightAction}
      </div>
    </header>
  );
}
