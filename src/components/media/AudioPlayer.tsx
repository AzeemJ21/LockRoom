'use client';

import { useEffect, useMemo, useRef, type MouseEvent } from 'react';

export function AudioPlayer({
  src,
  secure = false,
}: {
  src: string;
  secure?: boolean;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    return () => {
      el?.pause();
    };
  }, []);

  const url = useMemo(() => src, [src]);

  const blockMenu = secure ? (e: MouseEvent<HTMLAudioElement>) => e.preventDefault() : undefined;

  return (
    <audio
      ref={ref}
      controls
      controlsList={secure ? 'nodownload' : undefined}
      className="w-full max-w-md"
      draggable={false}
      onContextMenu={blockMenu}
    >
      <source src={url} />
    </audio>
  );
}
