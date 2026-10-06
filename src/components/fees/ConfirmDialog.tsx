import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { tr } from '@/lib/tr';

/**
 * In-app confirmation instead of window.confirm: `const [confirm, dialog] = useConfirm();`
 * then `if (await confirm(text)) ...` and render `{dialog}`.
 */
export function useConfirm(): [(text: string) => Promise<boolean>, JSX.Element] {
  const [text, setText] = useState<string | null>(null);
  const resolver = useRef<(ok: boolean) => void>();

  const confirm = useCallback((t: string) => new Promise<boolean>(resolve => {
    resolver.current = resolve;
    setText(t);
  }), []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = undefined;
    setText(null);
  };

  const dialog = (
    <AlertDialog open={text !== null} onOpenChange={o => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr('¿Seguro?')}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{tr('Cancelar')}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => close(true)}>
            {tr('Eliminar')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [confirm, dialog];
}
