import type { Message } from '@/lib/types/message.types';

export function messageReplyPreview(m: Message): string {
  if (m.media) {
    if (m.media.kind === 'audio') return 'Voice message';
    if (m.media.kind === 'image') return 'Image';
    if (m.media.kind === 'video') return 'Video';
    return m.media.name;
  }
  const t = m.decryptedContent?.trim() ?? '';
  if (!t) return 'Message';
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}
