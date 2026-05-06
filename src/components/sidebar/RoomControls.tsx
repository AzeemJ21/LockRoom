'use client';

import { useState } from 'react';
import { Phone, ScreenShare, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PanicButton } from '@/components/privacy/PanicButton';

export function RoomControls({
  onLeave,
  onCallAudio,
  onCallVideo,
  onCallScreen,
  onPanic,
}: {
  onLeave: () => void;
  onCallAudio: () => void | Promise<void>;
  onCallVideo: () => void | Promise<void>;
  onCallScreen: () => void | Promise<void>;
  onPanic: () => void;
}) {
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="ghost" className="px-2" onClick={() => void onCallAudio()} aria-label="Audio call">
          <Phone className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className="px-2" onClick={() => void onCallVideo()} aria-label="Video call">
          <Video className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-2"
          onClick={() => void onCallScreen()}
          aria-label="Screen share"
        >
          <ScreenShare className="h-4 w-4" />
        </Button>
      </div>

      <Button type="button" variant="ghost" className="w-full" onClick={() => setLeaveOpen(true)}>
        Leave room
      </Button>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-text-muted">Emergency wipe</div>
        <PanicButton onPanic={onPanic} />
      </div>

      <Modal open={leaveOpen} onOpenChange={setLeaveOpen} title="Leave this room?">
        <div className="space-y-4">
          <p>You will disconnect from the live relay. Ephemeral keys are wiped from memory.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setLeaveOpen(false);
                onLeave();
              }}
            >
              Leave
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
