export async function getUserMediaStream(audio: boolean, video: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio, video });
}

export async function getDisplayMediaStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30, max: 60 } },
      audio: true,
    });
  } catch {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }
}
