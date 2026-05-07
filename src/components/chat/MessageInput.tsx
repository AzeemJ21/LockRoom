'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Camera, Paperclip, Send, X } from 'lucide-react';
import { Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { VoiceRecorder } from '@/components/media/VoiceRecorder';
import { SnapchatCamera } from '@/components/media/SnapchatCamera';
import { cn } from '@/lib/utils/cn';
import { MAX_FILE_SIZE_BYTES } from '@/lib/utils/constants';
import type { Message } from '@/lib/types/message.types';
import { messageReplyPreview } from '@/lib/utils/messagePreview';

const EmojiPicker = dynamic(async () => (await import('emoji-picker-react')).default, { ssr: false });

export function MessageInput({
  disabled,
  onSendText,
  onTyping,
  onStopTyping,
  onUploadFile,
  onVoiceBlob,
  replyingTo,
  onCancelReply,
}: {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void> | void;
  onTyping: () => void;
  onStopTyping: () => void;
  onUploadFile?: (file: File) => Promise<void> | void;
  onVoiceBlob?: (blob: Blob) => Promise<void> | void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}) {
  const { push } = useToast();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !disabled, [text, disabled]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    onStopTyping();
    await onSendText(t);
  };

  return (
    <div className="border-t border-white/10 bg-background-secondary/40 px-3 py-3 backdrop-blur">
      <SnapchatCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        disabled={disabled || !onUploadFile}
        onError={(msg) => push(msg, 'error')}
        onCapture={async (file) => {
          if (!onUploadFile) return;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            push('File is too large.', 'error');
            return;
          }
          try {
            await onUploadFile(file);
          } catch (err) {
            push(err instanceof Error ? err.message : 'Upload failed', 'error');
          }
        }}
      />
      {replyingTo ? (
        <div className="relative mx-auto mb-2 flex max-w-4xl items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">Replying to</div>
            <div className="truncate">{messageReplyPreview(replyingTo)}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 shrink-0 px-0"
            aria-label="Cancel reply"
            onClick={() => onCancelReply?.()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-4xl items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.txt,.heic,.heif,.mov,.m4v,.mp4,.webm"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !onUploadFile) return;
            if (file.size > MAX_FILE_SIZE_BYTES) {
              push('File is too large.', 'error');
              return;
            }
            try {
              await onUploadFile(file);
            } catch (err) {
              push(err instanceof Error ? err.message : 'Upload failed', 'error');
            }
          }}
        />

        <Button
          type="button"
          variant="ghost"
          className="px-3"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="px-3 lg:hidden"
          disabled={disabled || !onUploadFile}
          onClick={() => setCameraOpen(true)}
          aria-label="Open camera"
        >
          <Camera className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="px-3"
          disabled={disabled}
          onClick={() => setEmojiOpen((v) => !v)}
          aria-label="Emoji"
        >
          <span className="text-lg leading-none">😊</span>
        </Button>

        <div className="relative min-w-0 flex-1">
          <Input
            value={text}
            disabled={disabled}
            onChange={(e) => {
              setText(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={disabled ? 'Waiting for encryption keys…' : 'Write an encrypted message…'}
          />

          {emojiOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-[calc(100%+10px)] left-0 z-[60]"
            >
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emoji) => {
                  setText((t) => `${t}${emoji.emoji}`);
                  onTyping();
                }}
              />
            </motion.div>
          )}
        </div>

        <VoiceRecorder
          disabled={disabled || !onVoiceBlob}
          onBlob={async (blob) => {
            if (!onVoiceBlob) return;
            try {
              await onVoiceBlob(blob);
            } catch (err) {
              push(err instanceof Error ? err.message : 'Voice send failed', 'error');
            }
          }}
        />

        <Button type="button" className="px-4" disabled={!canSend} onClick={() => void send()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className={cn('mx-auto mt-2 max-w-4xl text-[11px] text-text-muted')}>
        <span className="lg:hidden">Swipe to reply · Camera: tap photo, hold video</span>
        <span className="hidden lg:inline">
          Swipe right on a message to reply · Shift+Enter for newline
        </span>
      </div>
    </div>
  );
}
