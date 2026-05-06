'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

/**
 * Browsers do not expose reliable screenshot APIs for privacy reasons.
 * We only signal likely context switches (tab hidden), which may correlate with capture attempts.
 */
export function ScreenshotWarning() {
  const { push } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && !fired.current) {
        fired.current = true;
        push('Your screen may be visible to others when you leave this tab.', 'info');
        window.setTimeout(() => {
          fired.current = false;
        }, 1500);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [push]);

  return null;
}
