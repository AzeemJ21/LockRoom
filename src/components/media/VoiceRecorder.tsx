'use client';

import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export function VoiceRecorder({
  disabled,
  onBlob,
}: {
  disabled?: boolean;
  onBlob: (blob: Blob) => void | Promise<void>;
}) {
  const { recording, start, finish } = useVoiceRecorder();

  return (
    <Button
      type="button"
      variant={recording ? 'danger' : 'ghost'}
      className="px-3"
      disabled={disabled}
      onClick={async () => {
        if (!recording) {
          await start();
          return;
        }
        const blob = await finish();
        if (blob) await onBlob(blob);
      }}
      aria-label="Voice note"
    >
      <motion.span animate={{ scale: recording ? [1, 1.08, 1] : 1 }} transition={{ repeat: recording ? Infinity : 0, duration: 1.1 }}>
        <Mic className="h-4 w-4" />
      </motion.span>
    </Button>
  );
}
