'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

const LONG_PRESS_MS = 380;
const MAX_RECORD_MS = 120_000;
const RECORD_SLICE_MS = 120;

function pickVideoMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function extensionForVideoMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  return 'webm';
}

export function SnapchatCamera({
  open,
  onClose,
  onCapture,
  disabled,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => Promise<void> | void;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [recording, setRecording] = useState(false);
  const [hasVideoDevice, setHasVideoDevice] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const attachStream = useCallback(async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setHasVideoDevice(true);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setHasVideoDevice(true);
      } catch {
        setHasVideoDevice(false);
        onError?.('Camera access was denied or unavailable.');
      }
    }
  }, [facingMode, onError, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setRecording(false);
      recordingRef.current = false;
      return;
    }
    void attachStream();
    return () => {
      stopStream();
    };
  }, [open, attachStream, stopStream]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearMaxRecordTimer = () => {
    if (maxRecordTimerRef.current) {
      clearTimeout(maxRecordTimerRef.current);
      maxRecordTimerRef.current = null;
    }
  };

  const stopVideoRecording = useCallback(() => {
    clearMaxRecordTimer();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      mr.stop();
    }
    mediaRecorderRef.current = null;
    recordingRef.current = false;
    setRecording(false);
  }, []);

  const startVideoRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || disabled || typeof MediaRecorder === 'undefined') {
      onError?.('Video recording is not supported in this browser.');
      return;
    }
    const mimeType = pickVideoMimeType();
    if (!mimeType) {
      onError?.('Video recording is not supported in this browser.');
      return;
    }

    chunksRef.current = [];
    try {
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        const ext = extensionForVideoMime(mimeType);
        const file = new File([blob], `clip-${Date.now()}.${ext}`, {
          type: blob.type || mimeType,
        });
        void (async () => {
          try {
            await onCapture(file);
            onClose();
          } catch {
            onError?.('Could not send video.');
          }
        })();
      };
      mr.start(RECORD_SLICE_MS);
      mediaRecorderRef.current = mr;
      recordingRef.current = true;
      setRecording(true);

      maxRecordTimerRef.current = setTimeout(() => {
        stopVideoRecording();
      }, MAX_RECORD_MS);
    } catch {
      onError?.('Could not start recording.');
    }
  }, [disabled, onCapture, onClose, onError, stopVideoRecording]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || disabled || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    await new Promise<void>((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            onError?.('Could not capture photo.');
            resolve();
            return;
          }
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          try {
            await onCapture(file);
            onClose();
          } catch {
            onError?.('Could not send photo.');
          }
          resolve();
        },
        'image/jpeg',
        0.88
      );
    });
  }, [disabled, onCapture, onClose, onError]);

  const onShutterPointerDown = (e: React.PointerEvent) => {
    if (disabled || !hasVideoDevice) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      void startVideoRecording();
    }, LONG_PRESS_MS);
  };

  const onShutterPointerUp = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    if (recordingRef.current || recording) {
      stopVideoRecording();
      clearLongPressTimer();
      return;
    }

    clearLongPressTimer();
    void capturePhoto();
  };

  const onShutterPointerCancel = () => {
    clearLongPressTimer();
    if (recordingRef.current || recording) {
      stopVideoRecording();
    }
  };

  const flipCamera = () => {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex flex-col bg-black"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent pt-[env(safe-area-inset-top)] pb-10">
            <div className="pointer-events-auto flex items-center justify-between px-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-12 shrink-0 rounded-full border border-white/20 bg-black/30 px-0 text-white backdrop-blur"
                aria-label="Close camera"
                onClick={() => {
                  clearLongPressTimer();
                  if (recordingRef.current) stopVideoRecording();
                  onClose();
                }}
              >
                <X className="h-6 w-6" />
              </Button>
              <span className="max-w-[min(46vw,160px)] truncate text-center text-[10px] font-medium text-white/85 sm:max-w-none sm:text-xs">
                Hold for video · Tap photo
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-12 shrink-0 rounded-full border border-white/20 bg-black/30 px-0 text-white backdrop-blur"
                aria-label="Flip camera"
                disabled={!hasVideoDevice || recording}
                onClick={() => flipCamera()}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {!hasVideoDevice ? (
            <div className="relative z-[5] mt-auto flex flex-1 items-center justify-center px-6 text-center text-sm text-white/80">
              Allow camera access to take photos and videos.
            </div>
          ) : null}

          <div className="relative z-10 mt-auto flex flex-col items-center gap-4 pb-8 pt-6">
            {recording ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-red-600/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg"
              >
                Recording…
              </motion.div>
            ) : (
              <div className="h-8" aria-hidden />
            )}

            <button
              type="button"
              disabled={disabled || !hasVideoDevice}
              className={cn(
                'relative flex h-[76px] w-[76px] touch-none items-center justify-center rounded-full border-4 border-white bg-white/10 outline-none transition-transform active:scale-95 disabled:opacity-40',
                recording && 'border-red-400 bg-red-500/40'
              )}
              aria-label={recording ? 'Release to finish recording' : 'Tap for photo, hold for video'}
              style={{ touchAction: 'none' }}
              onPointerDown={onShutterPointerDown}
              onPointerUp={onShutterPointerUp}
              onPointerCancel={onShutterPointerCancel}
              onPointerLeave={onShutterPointerCancel}
            >
              <motion.span
                className="h-[56px] w-[56px] rounded-full bg-white"
                animate={{
                  scale: recording ? [1, 0.92, 1] : 1,
                }}
                transition={
                  recording ? { repeat: Infinity, duration: 0.9 } : { duration: 0.2 }
                }
              />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
