import type { Message } from '@/lib/types/message.types';

/** Wire payload for NEW_MESSAGE — opaque ciphertext only; server never inspects envelopes. */
export interface NewMessageWirePayload {
  message: Omit<Message, 'decryptedContent'>;
  timestamp: number;
  fromSocketId: string;
}
