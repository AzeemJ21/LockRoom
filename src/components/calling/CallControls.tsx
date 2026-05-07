'use client';

import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { CallStatus } from '@/hooks/useWebRTC';

export function CallControls({
  status,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onHangUp,
}: {
  status: CallStatus;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-background-secondary/90 px-3 py-2 shadow-2xl backdrop-blur sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <Button type="button" variant="ghost" className="rounded-full px-3" onClick={onToggleMute}>
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      <Button type="button" variant="ghost" className="rounded-full px-3" onClick={onToggleCamera}>
        {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>
      <Button type="button" variant="danger" className="rounded-full px-4" onClick={onHangUp}>
        <PhoneOff className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
