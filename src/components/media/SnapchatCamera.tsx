'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

const LONG_PRESS_MS = 380;

/** Max clip length sent through chat (sync with product expectation). */
export const MAX_CAMERA_VIDEO_MS = 30_000;
const RECORD_SLICE_MS = 120;

function formatRecordingClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
      setElapsedMs(0);
      return;
    }
    void attachStream();
    return () => {
      stopStream();
    };
  }, [open, attachStream, stopStream]);

  /** Recording clock + progress (smooth bar). */
  useEffect(() => {
    if (!recording) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    setElapsedMs(0);
    const tick = () => setElapsedMs(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [recording]);

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
        const primaryMime = mimeType.split(';')[0]?.trim() ?? 'video/webm';
        const blob = new Blob(chunksRef.current, { type: primaryMime });
        chunksRef.current = [];
        const ext = extensionForVideoMime(mimeType);
        const file = new File([blob], `clip-${Date.now()}.${ext}`, {
          type: primaryMime,
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
      }, MAX_CAMERA_VIDEO_MS);
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

  const progress = Math.min(elapsedMs / MAX_CAMERA_VIDEO_MS, 1);
  const maxClock = formatRecordingClock(MAX_CAMERA_VIDEO_MS);

  /** Portal to `document.body` so `position:fixed` is not clipped by ancestor `backdrop-filter` / transforms (e.g. chat input bar). */
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="snapchat-camera"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex min-h-[100dvh] min-w-0 flex-col bg-black overscroll-none"
          style={{
            touchAction: 'none',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 z-0 h-full min-h-0 w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Top chrome */}
          <header className="relative z-10 grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 px-2 pt-1 sm:px-4 sm:pt-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-white/20 bg-black/35 px-0 text-white shadow-lg backdrop-blur-md sm:h-12 sm:w-12"
              aria-label="Close camera"
              onClick={() => {
                clearLongPressTimer();
                if (recordingRef.current) stopVideoRecording();
                onClose();
              }}
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-center">
              <span className="text-[11px] font-medium leading-tight text-white/95 sm:text-xs">
                Tap photo · Hold video
              </span>
              <span className="text-[10px] text-white/55 sm:text-[11px]">Max {maxClock} clip</span>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-[44px] min-w-[44px] shrink-0 justify-self-end rounded-full border border-white/20 bg-black/35 px-0 text-white shadow-lg backdrop-blur-md sm:h-12 sm:w-12"
              aria-label="Flip camera"
              disabled={!hasVideoDevice || recording}
              onClick={() => flipCamera()}
            >
              <RefreshCw className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
            </Button>
          </header>

          {!hasVideoDevice ? (
            <div className="relative z-[5] mt-auto flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-white/85">
                Allow camera access in your browser settings to take photos and record video.
              </p>
            </div>
          ) : null}

          {/* Bottom dock */}
          <div className="relative z-10 mt-auto flex w-full shrink-0 flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:gap-4 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
            <div className="flex w-full max-w-md flex-col items-center gap-2">
              {recording ? (
                <div className="flex w-full flex-col items-center gap-2">
                  <div className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                      {formatRecordingClock(elapsedMs)}
                    </span>
                    <span className="text-sm text-white/45">/ {maxClock}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-[width] duration-150 ease-linear"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300"
                  >
                    Recording
                  </motion.span>
                </div>
              ) : (
                <div className="h-[52px] sm:h-14" aria-hidden />
              )}
            </div>

            <button
              type="button"
              disabled={disabled || !hasVideoDevice}
              className={cn(
                'relative flex shrink-0 touch-none items-center justify-center rounded-full border-[5px] border-white bg-white/15 outline-none ring-offset-2 ring-offset-black transition-transform active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 sm:border-[6px]',
                'h-[clamp(4.75rem,21vmin,5.75rem)] w-[clamp(4.75rem,21vmin,5.75rem)]',
                recording && 'border-red-400 bg-red-500/35 shadow-[0_0_24px_rgba(248,113,113,0.45)]'
              )}
              aria-label={recording ? 'Release to finish recording' : 'Tap for photo, hold for video'}
              style={{ touchAction: 'none' }}
              onPointerDown={onShutterPointerDown}
              onPointerUp={onShutterPointerUp}
              onPointerCancel={onShutterPointerCancel}
              onPointerLeave={onShutterPointerCancel}
            >
              <motion.span
                className={cn(
                  'rounded-full bg-white shadow-inner',
                  'h-[clamp(3.35rem,15vmin,4.15rem)] w-[clamp(3.35rem,15vmin,4.15rem)]'
                )}
                animate={{
                  scale: recording ? [1, 0.93, 1] : 1,
                }}
                transition={
                  recording ? { repeat: Infinity, duration: 0.85, ease: 'easeInOut' } : { duration: 0.2 }
                }
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
