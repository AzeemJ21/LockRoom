'use client';

import { useCallback, useState } from 'react';
import { encryptFile } from '@/lib/crypto/encryption';
import { isAllowedMime } from '@/lib/utils/fileUtils';
import { MAX_FILE_SIZE_BYTES } from '@/lib/utils/constants';

interface UploadResult {
  fileId: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function useMediaUpload(sharedKey: CryptoKey | null) {
  const [uploading, setUploading] = useState(false);

  const uploadEncryptedFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!sharedKey) return null;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds maximum size');
      }
      if (!isAllowedMime(file.type)) {
        throw new Error('File type not allowed');
      }

      setUploading(true);
      try {
        const buf = await file.arrayBuffer();
        const { ciphertext, iv } = await encryptFile(buf, sharedKey);
        const body = {
          name: file.name,
          mime: file.type,
          iv,
          data: toBase64(ciphertext),
        };

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? 'Upload failed');
        }

        const json = (await res.json()) as UploadResult;
        return json;
      } finally {
        setUploading(false);
      }
    },
    [sharedKey]
  );

  return { uploading, uploadEncryptedFile };
}
