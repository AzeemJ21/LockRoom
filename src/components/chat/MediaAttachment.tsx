'use client';

import { useEffect, useState } from 'react';
import { decryptFile } from '@/lib/crypto/encryption';
import { keyStore } from '@/lib/crypto/keyStore';
import type { MediaDescriptor } from '@/lib/types/message.types';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { VideoPlayer } from '@/components/media/VideoPlayer';

export function MediaAttachment({ senderId, media }: { senderId: string; media: MediaDescriptor }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      const key = keyStore.getSharedKey(senderId);
      if (!key) {
        setError('No encryption key');
        return;
      }
      try {
        const res = await fetch(`/api/upload/${media.fileId}`);
        if (!res.ok) throw new Error('Download failed');
        const json = (await res.json()) as { iv?: string; data?: string };
        if (!json.iv || !json.data) throw new Error('Bad payload');
        const ct = Uint8Array.from(atob(json.data), (c) => c.charCodeAt(0));
        const plain = await decryptFile(ct.buffer, json.iv, key);
        if (cancelled) return;
        const blob = new Blob([plain], { type: media.mime });
        const url = URL.createObjectURL(blob);
        revoked = url;
        setObjectUrl(url);
      } catch {
        if (!cancelled) setError('Could not decrypt');
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [senderId, media.fileId, media.mime]);

  if (error) {
    return <span className="text-xs opacity-80">{error}</span>;
  }
  if (!objectUrl) {
    return <span className="text-xs opacity-70">Decrypting…</span>;
  }

  if (media.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob URL from decrypted bytes
      <img src={objectUrl} alt="" className="max-h-72 max-w-full rounded-xl object-contain" />
    );
  }
  if (media.kind === 'video') {
    return <VideoPlayer src={objectUrl} />;
  }
  if (media.kind === 'audio') {
    return <AudioPlayer src={objectUrl} />;
  }

  return (
    <a
      href={objectUrl}
      download={media.name}
      className="text-sm font-medium underline underline-offset-2"
    >
      {media.name}
    </a>
  );
}
