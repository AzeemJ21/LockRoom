export const SOCKET_EVENTS = {
  // Room lifecycle
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_DESTROYED: 'room:destroyed',
  /** Server pushed after Mongo + in-memory room code migration */
  ROOM_CODE_CHANGED: 'room:code_changed',
  USER_JOINED: 'room:user_joined',
  USER_LEFT: 'room:user_left',
  ERROR: 'room:error',

  // Messaging
  SEND_MESSAGE: 'message:send',
  NEW_MESSAGE: 'message:new',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_TYPING: 'typing:user',

  // Encryption
  KEY_EXCHANGE: 'crypto:key_exchange',
  KEY_RECEIVED: 'crypto:key_received',

  // WebRTC Calling
  CALL_OFFER: 'call:offer',
  CALL_ANSWER: 'call:answer',
  CALL_END: 'call:end',
  INCOMING_CALL: 'call:incoming',
  CALL_ANSWERED: 'call:answered',
  CALL_ENDED: 'call:ended',
  ICE_CANDIDATE: 'call:ice_candidate',
  ICE_CANDIDATE_RECEIVED: 'call:ice_candidate_received',

  // Media
  FILE_UPLOADED: 'media:file_uploaded',
} as const;

export type SocketEventKey = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
