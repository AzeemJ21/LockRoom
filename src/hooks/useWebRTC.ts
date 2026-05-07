'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { createPeerConnection } from '@/lib/webrtc/peerConnection';
import { getUserMediaStream, getDisplayMediaStream } from '@/lib/webrtc/mediaStream';
import type { CallType as CT } from '@/lib/types/webrtc.types';

export type CallType = CT;
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

function buildIceServersFromEnv(): RTCIceServer[] {
  const stunList =
    process.env.NEXT_PUBLIC_STUN_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean) ??
    ['stun:stun.l.google.com:19302'];
  const servers: RTCIceServer[] = stunList.map((urls) => ({ urls }));

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

async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch('/api/rtc/ice-config', { cache: 'no-store' });
    if (!res.ok) return buildIceServersFromEnv();
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      return data.iceServers;
    }
  } catch {
    /* same-origin / offline */
  }
  return buildIceServersFromEnv();
}

export function useWebRTC(socket: Socket | null, userId: string) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteSocketId = useRef<string | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
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

  const flushIceQueue = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;
    const pending = iceQueueRef.current;
    iceQueueRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingRemoteSocketId.current = null;
    iceQueueRef.current = [];
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setLocalStreamVersion((v) => v + 1);
  }, []);

  const createPeerConnectionFor = useCallback(
    (targetSocketId: string, iceServers: RTCIceServer[]) => {
      const pc = createPeerConnection(iceServers);
      pendingRemoteSocketId.current = targetSocketId;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && socket?.connected) {
          socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { targetSocketId, candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) setRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
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
      const iceServers = await fetchIceServers();
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
      iceQueueRef.current = [];
      const pc = createPeerConnectionFor(targetSocketId, iceServers);
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
      const iceServers = await fetchIceServers();
      setCallStatus('connected');
      setCallType(type);

      /** Remote shares screen — answer with camera+mic so they see/hear you (do not prompt for screen capture). */
      const stream =
        type === 'screen'
          ? await getUserMediaStream(true, true)
          : await getUserMediaStream(true, type === 'video');

      localStreamRef.current = stream;
      setLocalStreamVersion((v) => v + 1);
      iceQueueRef.current = [];
      const pc = createPeerConnectionFor(callerSocketId, iceServers);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushIceQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit(SOCKET_EVENTS.CALL_ANSWER, { targetSocketId: callerSocketId, answer });
      setIncomingCall(null);
    },
    [socket, createPeerConnectionFor, flushIceQueue]
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
      const pc = peerConnectionRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushIceQueue();
      setCallStatus('connected');
    };

    const onIce = async ({
      candidate,
      fromSocketId,
    }: {
      candidate: RTCIceCandidateInit;
      fromSocketId: string;
    }) => {
      if (!candidate || fromSocketId !== pendingRemoteSocketId.current) return;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        iceQueueRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        iceQueueRef.current.push(candidate);
      }
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
  }, [socket, endCall, flushIceQueue]);

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
