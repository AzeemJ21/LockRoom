'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { createPeerConnection } from '@/lib/webrtc/peerConnection';
import { getUserMediaStream, getDisplayMediaStream } from '@/lib/webrtc/mediaStream';
import type { CallType as CT } from '@/lib/types/webrtc.types';

export type CallType = CT;
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

function buildIceServers(): RTCIceServer[] {
  const stunList =
    process.env.NEXT_PUBLIC_STUN_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean) ??
    ['stun:stun.l.google.com:19302'];
  const servers: RTCIceServer[] = stunList.map((urls) => ({ urls }));

  // Long-lived TURN username/secret must not ship to browsers in production — swap for minted tokens server-side.
  if (process.env.NEXT_PUBLIC_TURN_URLS) {
    const urls = process.env.NEXT_PUBLIC_TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length) {
      servers.push({
        urls,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      });
    }
  }

  return servers;
}

export function useWebRTC(socket: Socket | null, userId: string) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteSocketId = useRef<string | null>(null);
  const [localStreamVersion, setLocalStreamVersion] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerSocketId: string;
    callType: CallType;
    offer: RTCSessionDescriptionInit;
  } | null>(null);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingRemoteSocketId.current = null;
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setLocalStreamVersion((v) => v + 1);
  }, []);

  const createPeerConnectionFor = useCallback(
    (targetSocketId: string) => {
      const pc = createPeerConnection(buildIceServers());
      pendingRemoteSocketId.current = targetSocketId;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && socket?.connected) {
          socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { targetSocketId, candidate });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          endCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [socket, endCall]
  );

  const startCall = useCallback(
    async (targetSocketId: string, type: CallType) => {
      if (!socket) return;
      setCallType(type);
      setCallStatus('calling');

      let stream: MediaStream;
      if (type === 'screen') {
        stream = await getDisplayMediaStream();
      } else {
        stream = await getUserMediaStream(true, type === 'video');
      }

      localStreamRef.current = stream;
      setLocalStreamVersion((v) => v + 1);
      const pc = createPeerConnectionFor(targetSocketId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit(SOCKET_EVENTS.CALL_OFFER, {
        targetSocketId,
        offer,
        callType: type,
        callerId: userId,
      });
    },
    [socket, userId, createPeerConnectionFor]
  );

  const answerCall = useCallback(
    async (callerSocketId: string, offer: RTCSessionDescriptionInit, type: CallType) => {
      if (!socket) return;
      setCallStatus('connected');
      setCallType(type);

      const stream =
        type === 'screen'
          ? await getDisplayMediaStream()
          : await getUserMediaStream(true, type === 'video');

      localStreamRef.current = stream;
      setLocalStreamVersion((v) => v + 1);
      const pc = createPeerConnectionFor(callerSocketId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit(SOCKET_EVENTS.CALL_ANSWER, { targetSocketId: callerSocketId, answer });
      setIncomingCall(null);
    },
    [socket, createPeerConnectionFor]
  );

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      offer: RTCSessionDescriptionInit;
      callType: CallType;
      callerId: string;
      callerSocketId: string;
    }) => {
      setIncomingCall({
        callerId: data.callerId,
        callerSocketId: data.callerSocketId,
        callType: data.callType,
        offer: data.offer,
      });
      setCallStatus('ringing');
    };

    const onAnswered = async ({
      answer,
      answererSocketId,
    }: {
      answer: RTCSessionDescriptionInit;
      answererSocketId: string;
    }) => {
      if (answererSocketId !== pendingRemoteSocketId.current) return;
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus('connected');
    };

    const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const onEnded = () => endCall();

    socket.on(SOCKET_EVENTS.INCOMING_CALL, onIncoming);
    socket.on(SOCKET_EVENTS.CALL_ANSWERED, onAnswered);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE_RECEIVED, onIce);
    socket.on(SOCKET_EVENTS.CALL_ENDED, onEnded);

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_CALL, onIncoming);
      socket.off(SOCKET_EVENTS.CALL_ANSWERED, onAnswered);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE_RECEIVED, onIce);
      socket.off(SOCKET_EVENTS.CALL_ENDED, onEnded);
    };
  }, [socket, endCall]);

  return {
    localStream: localStreamRef.current,
    localStreamVersion,
    remoteStream,
    callStatus,
    callType,
    isMuted,
    isCameraOff,
    incomingCall,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}

export type WebRTCApi = ReturnType<typeof useWebRTC>;
