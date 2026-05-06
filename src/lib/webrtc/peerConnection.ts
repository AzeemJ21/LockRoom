/**
 * Thin RTCPeerConnection factory — DTLS-SRTP is enforced by browser engines.
 */
export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });
}
