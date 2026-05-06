'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CallType } from '@/hooks/useWebRTC';

export function IncomingCallModal({
  open,
  callerId,
  callType,
  onAccept,
  onDecline,
}: {
  open: boolean;
  callerId: string;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => (!v ? onDecline() : null)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content forceMount asChild>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className="fixed left-1/2 top-1/2 z-[96] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-background-secondary p-6 shadow-2xl"
              >
                <Dialog.Title className="text-lg font-semibold text-text-primary">Incoming call</Dialog.Title>
                <div className="mt-2 text-sm text-text-secondary">
                  <span className="font-mono text-text-primary">{callerId}</span>
                  <span className="mx-2 text-text-muted">·</span>
                  <span className="uppercase">{callType}</span>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button type="button" className="flex-1" onClick={onAccept}>
                    <Phone className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button type="button" variant="danger" className="flex-1" onClick={onDecline}>
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
