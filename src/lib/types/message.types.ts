export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

/** Per-recipient envelopes for pairwise AES keys in group rooms. */
export type MessageEnvelopes = Record<string, EncryptedPayload>;

export interface Message {
  id: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  timestamp: number;
  /** Legacy single envelope (e.g. early pair-wise tests). */
  encrypted?: EncryptedPayload;
  /** Preferred transport for group chats — each recipient decrypts their slot. */
  envelopes?: MessageEnvelopes;
  decryptedContent?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  isRead?: boolean;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
}
