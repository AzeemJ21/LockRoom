'use client';

export function VideoPlayer({ src }: { src: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided clip
    <video className="w-full max-w-xl rounded-2xl border border-white/10" controls playsInline src={src} />
  );
}
