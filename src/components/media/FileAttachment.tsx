'use client';

import { FileText } from 'lucide-react';
import { formatBytes } from '@/lib/utils/fileUtils';

export function FileAttachment({ name, size }: { name: string; size?: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-background-secondary/60 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
        <FileText className="h-5 w-5 text-text-secondary" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm text-text-primary">{name}</div>
        {typeof size === 'number' ? (
          <div className="text-xs text-text-muted">{formatBytes(size)}</div>
        ) : null}
      </div>
    </div>
  );
}
