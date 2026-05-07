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
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="fixed left-1/2 z-[101] w-[min(100vw-2rem,28rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-2xl focus:outline-none
                bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] top-auto max-h-[min(55dvh,28rem)] overflow-y-auto
                sm:bottom-auto sm:top-1/2 sm:max-h-[min(85vh,32rem)] sm:-translate-y-1/2"
            >
              <Dialog.Title className="text-lg font-semibold text-text-primary">Incoming call</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                <span className="font-mono text-text-primary">{callerId}</span>
                <span className="mx-2 text-text-muted">·</span>
                <span className="uppercase">{callType}</span>
              </Dialog.Description>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button type="button" className="min-h-[48px] w-full sm:flex-1" onClick={onAccept}>
                  <Phone className="mr-2 h-4 w-4" />
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="min-h-[48px] w-full sm:flex-1"
                  onClick={onDecline}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Decline
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
