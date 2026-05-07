'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { HeroBackground } from '@/components/landing/HeroBackground';
import { RoomCodeInput } from '@/components/landing/RoomCodeInput';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/utils/roomCode';

export function LandingPage() {
  const router = useRouter();
  const { push } = useToast();
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);

  const canEnter = useMemo(() => isValidRoomCode(code), [code]);

  const enterRoom = () => {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      push('Enter a valid room code (6–10 letters/numbers).', 'error');
      return;
    }
    router.push(`/room/${normalized}`);
  };

  const createRoom = async () => {
    setCreating(true);
    try {
      const normalized = normalizeRoomCode(code);
      const hasInput = normalized.length > 0;
      if (hasInput && !isValidRoomCode(normalized)) {
        push('Use 6–10 letters or numbers for your code, or leave the box empty for a random room.', 'error');
        return;
      }
      const useCustom = hasInput && isValidRoomCode(normalized);
      let res = await fetch('/api/rooms', {
        method: 'POST',
        headers: useCustom ? { 'Content-Type': 'application/json' } : undefined,
        body: useCustom ? JSON.stringify({ code: normalized }) : undefined,
      });

      /** Chosen code already reserved in Mongo — create a random room instead. */
      if (res.status === 409 && useCustom) {
        push('That code is already taken. Creating a random room instead…', 'info');
        res = await fetch('/api/rooms', { method: 'POST' });
      }

      const raw = await res.text();
      if (!res.ok) {
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
        const err =
          (typeof parsed?.error === 'string' && parsed.error) ||
          (typeof parsed?.message === 'string' && parsed.message) ||
          null;
        const detail = typeof parsed?.detail === 'string' ? parsed.detail : null;
        const combined =
          detail && process.env.NODE_ENV === 'development'
            ? `${err ?? 'Request failed'} — ${detail}`
            : err;
        const fallback =
          raw && !parsed
            ? `Server error (${res.status}). ${raw.slice(0, 160)}${raw.length > 160 ? '…' : ''}`
            : `Could not create a room (${res.status}).`;
        push(combined ?? fallback, 'error');
        return;
      }
      const json = JSON.parse(raw) as { code: string };
      router.push(`/room/${json.code}`);
    } catch {
      push('Network error while creating a room.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        {/* SSR + first paint must not rely on opacity:0 — invisible HTML until JS runs causes a blank screen */}
        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-panel w-full max-w-xl p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Lock className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-text-muted">cipher</div>
              <div className="text-sm text-text-secondary">Ephemeral rooms · WebCrypto · Socket.IO</div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <h1 className="text-4xl font-semibold leading-tight text-text-primary">
              Secure. Ephemeral. Yours.
            </h1>
            <p className="text-base text-text-secondary">
              End-to-end encrypted rooms. No accounts. No history. No traces.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <RoomCodeInput value={code} onValueChange={setCode} />
            <p className="text-xs text-text-muted">
              Type a code (6–10 characters) and tap Create to reserve it, or leave empty for a random code. If your code is already taken, we’ll create a random room for you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" disabled={!canEnter} onClick={enterRoom}>
                Enter Room
              </Button>
              <Button variant="ghost" className="flex-1" disabled={creating} onClick={createRoom}>
                {creating ? 'Creating…' : code.trim().length > 0 ? 'Create with this code' : 'Create Room'}
              </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {['🔐 E2E Encrypted', '⚡ Real-time', '🗑️ Zero Persistence'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-text-muted">
            Messages are encrypted client-side. The server relays opaque ciphertext and cannot read your conversations.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
