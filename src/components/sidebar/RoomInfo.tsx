'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export function RoomInfo({ roomCode }: { roomCode: string }) {
  const { push } = useToast();
  const [showQrHint, setShowQrHint] = useState(false);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/room/${roomCode}`;
  }, [roomCode]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-text-muted">Room</div>
          <motion.div layout className="mt-1 font-mono text-lg tracking-widest text-text-primary">
            {roomCode}
          </motion.div>
        </div>
        <Badge>Encrypted</Badge>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(roomCode);
              push('Room code copied.');
            } catch {
              push('Clipboard unavailable.', 'error');
            }
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy code
        </Button>
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowQrHint((v) => !v)}>
          <QrCode className="mr-2 h-4 w-4" />
          QR
        </Button>
      </div>

      {showQrHint && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-text-secondary"
        >
          Optional: encode this URL in any QR generator:
          <div className="mt-2 break-all font-mono text-[11px] text-text-muted">{shareUrl}</div>
        </motion.div>
      )}
    </div>
  );
}
