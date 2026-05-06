'use client';

import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { WebRTCApi } from '@/hooks/useWebRTC';
import { VideoGrid } from '@/components/calling/VideoGrid';
import { CallControls } from '@/components/calling/CallControls';
import { IncomingCallModal } from '@/components/calling/IncomingCallModal';
import { ScreenShareOverlay } from '@/components/calling/ScreenShareOverlay';

export function CallManager({
  socket,
  rtc,
  peerSocketId,
}: {
  socket: Socket | null;
  rtc: WebRTCApi;
  peerSocketId?: string;
}) {
  const hangUp = () => {
    if (peerSocketId && socket?.connected) {
      socket.emit(SOCKET_EVENTS.CALL_END, { targetSocketId: peerSocketId });
    }
    rtc.endCall();
  };

  const accept = async () => {
    if (!rtc.incomingCall) return;
    await rtc.answerCall(
      rtc.incomingCall.callerSocketId,
      rtc.incomingCall.offer,
      rtc.incomingCall.callType
    );
  };

  const decline = () => {
    if (rtc.incomingCall && socket?.connected) {
      socket.emit(SOCKET_EVENTS.CALL_END, { targetSocketId: rtc.incomingCall.callerSocketId });
    }
    rtc.endCall();
  };

  const activeCall =
    rtc.callStatus !== 'idle' &&
    (rtc.callStatus === 'connected' || rtc.callStatus === 'calling' || rtc.callStatus === 'ringing');

  return (
    <>
      {activeCall ? (
        <VideoGrid
          localStream={rtc.localStream}
          remoteStream={rtc.remoteStream}
          localStreamVersion={rtc.localStreamVersion}
        />
      ) : null}

      <ScreenShareOverlay active={rtc.callType === 'screen' && rtc.callStatus === 'connected'} />

      <IncomingCallModal
        open={Boolean(rtc.incomingCall) && rtc.callStatus === 'ringing'}
        callerId={rtc.incomingCall?.callerId ?? ''}
        callType={rtc.incomingCall?.callType ?? 'audio'}
        onAccept={() => void accept()}
        onDecline={decline}
      />

      <CallControls
        status={rtc.callStatus}
        isMuted={rtc.isMuted}
        isCameraOff={rtc.isCameraOff}
        onToggleMute={rtc.toggleMute}
        onToggleCamera={rtc.toggleCamera}
        onHangUp={hangUp}
      />
    </>
  );
}
