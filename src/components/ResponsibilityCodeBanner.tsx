import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserRole } from '@/hooks/useUserRole';
import { useClub } from '@/hooks/useClub';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, FileCheck, CheckCircle } from 'lucide-react';

export function ResponsibilityCodeBanner() {
  const { profile } = useUserRole();
  const { club } = useClub();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Don't show if already accepted or no club code
  if (profile?.responsibility_code_accepted_at || !club?.responsibility_code) {
    return null;
  }

  const handleAccept = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ responsibility_code_accepted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Código de responsabilidad aceptado');
      setShowDialog(false);
      window.location.reload();
    } catch (error) {
      console.error('Error accepting responsibility code:', error);
      toast.error('Error al aceptar el código');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <>
      <div className="mx-4 mb-4 p-4 rounded-lg bg-amber-500/15 border-2 border-amber-500/50 animate-pulse">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              ¡Acción requerida!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Debes aceptar el código de responsabilidad del club antes de continuar trabajando con datos de menores.
            </p>
            <Button
              size="sm"
              onClick={() => setShowDialog(true)}
              className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <FileCheck className="h-4 w-4" />
              Ver y aceptar código
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Código de Responsabilidad
            </DialogTitle>
            <DialogDescription>
              Lee y acepta el código de responsabilidad del club {club?.name}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="prose prose-sm dark:prose-invert">
              <div 
                className="text-sm text-muted-foreground whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: club?.responsibility_code?.replace(/\n/g, '<br/>') || '' }}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={accepting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {accepting ? 'Aceptando...' : 'Acepto el código'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
