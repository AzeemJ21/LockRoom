'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Mic, Paperclip, Send } from 'lucide-react';
import { Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils/cn';
import { MAX_FILE_SIZE_BYTES } from '@/lib/utils/constants';
import { isAllowedMime } from '@/lib/utils/fileUtils';

const EmojiPicker = dynamic(async () => (await import('emoji-picker-react')).default, { ssr: false });

export function MessageInput({
  disabled,
  onSendText,
  onTyping,
  onStopTyping,
  onUploadFile,
}: {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void> | void;
  onTyping: () => void;
  onStopTyping: () => void;
  onUploadFile?: (file: File) => Promise<void> | void;
}) {
  const { push } = useToast();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
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
      <div className="relative mx-auto flex max-w-4xl items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !onUploadFile) return;
            if (file.size > MAX_FILE_SIZE_BYTES) {
              push('File is too large.', 'error');
              return;
            }
            if (!isAllowedMime(file.type)) {
              push('Unsupported file type.', 'error');
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

        <Button type="button" variant="ghost" className="px-3" disabled aria-label="Voice note (placeholder)">
          <Mic className="h-4 w-4" />
        </Button>

        <Button type="button" className="px-4" disabled={!canSend} onClick={() => void send()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className={cn('mx-auto mt-2 max-w-4xl text-[11px] text-text-muted')}>
        Shift+Enter for newline · AES-GCM envelopes per recipient
      </div>
    </div>
  );
}
