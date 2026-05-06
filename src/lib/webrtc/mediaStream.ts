export async function getUserMediaStream(audio: boolean, video: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio, video });
}

export async function getDisplayMediaStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
}
