export interface Participant {
  userId: string;
  socketId: string;
  displayName: string;
  publicKey?: string;
  isOnline: boolean;
  joinedAt: number;
}

export interface RoomState {
  code: string;
  participants: Participant[];
  isEncryptionReady: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}
