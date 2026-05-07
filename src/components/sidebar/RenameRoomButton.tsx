'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/utils/roomCode';

export function RenameRoomButton({
  roomCode,
  compact,
  className,
}: {
  roomCode: string;
  /** Icon-only (e.g. mobile header) */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = normalizeRoomCode(next);
    if (!isValidRoomCode(n)) {
      push('Enter a valid code (6–10 letters or digits).', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCode: n }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        push(typeof data.error === 'string' ? data.error : 'Could not rename room.', 'error');
        return;
      }
      const code = typeof data.code === 'string' ? data.code : n;
      setOpen(false);
      setNext('');
      router.replace(`/room/${code}`);
      push('Room code updated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={className}
        onClick={() => {
          setNext('');
          setOpen(true);
        }}
        aria-label="Change room code"
      >
        <Pencil className={compact ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
        {!compact ? 'Change code' : null}
      </Button>

      <Modal open={open} onOpenChange={setOpen} title="Change room code">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Everyone staying in this session keeps chatting. Share the new code or link; the old room URL
            will not work for new joins.
          </p>
          <Input
            value={next}
            onChange={(e) =>
              setNext(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
            }
            placeholder="NEWCODE1"
            maxLength={10}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
