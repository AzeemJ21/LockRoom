export type CallType = 'audio' | 'video' | 'screen';

export interface IceSignalPayload {
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
}

export interface OfferSignalPayload {
  targetSocketId: string;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
  callerId: string;
}

export interface AnswerSignalPayload {
  targetSocketId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IncomingCallPayload {
  offer: RTCSessionDescriptionInit;
  callType: CallType;
  callerId: string;
  callerSocketId: string;
}
