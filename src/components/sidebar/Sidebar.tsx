'use client';

import { motion } from 'framer-motion';
import { RoomInfo } from '@/components/sidebar/RoomInfo';
import { ParticipantList } from '@/components/sidebar/ParticipantList';
import { RoomControls } from '@/components/sidebar/RoomControls';
import type { Participant } from '@/lib/types/room.types';

export function Sidebar(props: {
  roomCode: string;
  participants: Participant[];
  userId: string;
  onLeave: () => void;
  onCallAudio: () => void | Promise<void>;
  onCallVideo: () => void | Promise<void>;
  onCallScreen: () => void | Promise<void>;
  onPanic: () => void;
}) {
  return (
    <motion.aside
      layout
      className="hidden h-full w-[320px] shrink-0 border-l border-white/10 bg-background-secondary/35 backdrop-blur lg:flex lg:flex-col"
    >
      <div className="border-b border-white/10 p-4">
        <RoomInfo roomCode={props.roomCode} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <ParticipantList participants={props.participants} selfId={props.userId} />
      </div>
      <div className="border-t border-white/10 p-4">
        <RoomControls
          onLeave={props.onLeave}
          onCallAudio={props.onCallAudio}
          onCallVideo={props.onCallVideo}
          onCallScreen={props.onCallScreen}
          onPanic={props.onPanic}
        />
      </div>
    </motion.aside>
  );
}
