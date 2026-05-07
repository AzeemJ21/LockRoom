'use client';

import type { MouseEvent } from 'react';

export function VideoPlayer({
  src,
  secure = false,
}: {
  src: string;
  /** When true, discourage saving / open-in-new-tab (best-effort; not DRM). */
  secure?: boolean;
}) {
  const blockMenu = secure ? (e: MouseEvent<HTMLVideoElement>) => e.preventDefault() : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided clip
    <video
      className="w-full max-w-xl rounded-2xl border border-white/10"
      controls
      playsInline
      src={src}
      draggable={false}
      controlsList={secure ? 'nodownload' : undefined}
      disablePictureInPicture={secure}
      onContextMenu={blockMenu}
    />
  );
}
