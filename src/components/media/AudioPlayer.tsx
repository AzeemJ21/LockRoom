'use client';

import { useEffect, useMemo, useRef } from 'react';

export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    return () => {
      el?.pause();
    };
  }, []);

  const url = useMemo(() => src, [src]);

  return (
    <audio ref={ref} controls className="w-full max-w-md">
      <source src={url} />
    </audio>
  );
}
