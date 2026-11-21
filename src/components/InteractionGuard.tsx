// Safety net for a known Radix UI issue: when a dropdown/dialog unmounts while closing
// (e.g. a menu item navigates to another page, or a dialog opens from a menu), the body can
// keep `pointer-events: none` and the scroll lock. On phones the app then looks frozen:
// nothing reacts to taps and the page doesn't scroll. When no overlay is actually open,
// remove those leftovers.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const OPEN_LAYER = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper]',
].join(',');

function release() {
  if (document.querySelector(OPEN_LAYER)) return;
  const b = document.body;
  if (b.style.pointerEvents === 'none') b.style.pointerEvents = '';
  if (b.hasAttribute('data-scroll-locked')) {
    b.removeAttribute('data-scroll-locked');
    b.style.removeProperty('overflow');
    b.style.removeProperty('padding-right');
    b.style.removeProperty('margin-right');
  }
}

export function InteractionGuard() {
  const { pathname } = useLocation();

  // Page changed: give closing animations a moment, then clean up.
  useEffect(() => {
    const t = setTimeout(release, 400);
    return () => clearTimeout(t);
  }, [pathname]);

  // Any change to the body lock attributes: re-check once the overlay has had time to close.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(release, 600);
    });
    // Attributes: the lock being set. childList: overlay portals (direct body children) being removed.
    obs.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'], childList: true });
    // Last resort for a lock left behind with nothing else changing afterwards.
    const iv = setInterval(() => {
      if (document.body.style.pointerEvents === 'none' || document.body.hasAttribute('data-scroll-locked')) release();
    }, 1500);
    return () => { obs.disconnect(); clearTimeout(t); clearInterval(iv); };
  }, []);

  return null;
}
