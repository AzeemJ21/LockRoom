'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function VideoGrid({
  localStream,
  remoteStream,
  localStreamVersion,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localStreamVersion: number;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.srcObject = localStream;
    void el.play().catch(() => {
      /* autoplay policies vary by browser */
    });
  }, [localStream, localStreamVersion]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {
      /* autoplay policies vary by browser */
    });
  }, [remoteStream]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
      <motion.div
        layout
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl"
      >
        {remoteStream ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- realtime WebRTC preview
          <video ref={remoteRef} className="h-full w-full object-cover" autoPlay playsInline />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-text-muted">
            Remote video
          </div>
        )}
      </motion.div>

      <motion.div layout className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
        {localStream ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- realtime WebRTC preview
          <video
            ref={localRef}
            className="h-full w-full scale-x-[-1] object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-text-muted">
            Local preview
          </div>
        )}
      </motion.div>
    </div>
  );
}
