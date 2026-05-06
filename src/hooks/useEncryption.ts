'use client';

import { useState, useCallback } from 'react';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from '@/lib/crypto/keyExchange';
import { encryptMessage, decryptMessage } from '@/lib/crypto/encryption';
import { keyStore } from '@/lib/crypto/keyStore';
import type { MessageEnvelopes } from '@/lib/types/message.types';

export function useEncryption() {
  const [isReady, setIsReady] = useState(false);
  const [publicKeyBase64, setPublicKeyBase64] = useState<string>('');

  const initialize = useCallback(async () => {
    const keyPair = await generateKeyPair();
    keyStore.setKeyPair(keyPair);
    const pubKey = await exportPublicKey(keyPair);
    setPublicKeyBase64(pubKey);
    setIsReady(true);
    return pubKey;
  }, []);

  const establishSharedKey = useCallback(async (peerId: string, peerPublicKeyBase64: string) => {
    const keyPair = keyStore.getKeyPair();
    if (!keyPair) throw new Error('Local key pair not initialized');
    const peerPubKey = await importPublicKey(peerPublicKeyBase64);
    const sharedKey = await deriveSharedKey(keyPair.privateKey, peerPubKey);
    keyStore.setSharedKey(peerId, sharedKey);
  }, []);

  const encrypt = useCallback(
    async (
      text: string,
      peerId?: string
    ): Promise<{ ciphertext: string; iv: string } | null> => {
      const key = peerId ? keyStore.getSharedKey(peerId) : keyStore.getFirstSharedKey();
      if (!key) return null;
      return encryptMessage(text, key);
    },
    []
  );

  const decrypt = useCallback(
    async (ciphertext: string, iv: string, peerId?: string): Promise<string | null> => {
      if (peerId) {
        const key = keyStore.getSharedKey(peerId);
        if (!key) return null;
        return decryptMessage(ciphertext, iv, key);
      }
      for (const key of keyStore.sharedKeyIterable()) {
        try {
          return await decryptMessage(ciphertext, iv, key);
        } catch {
          continue;
        }
      }
      return null;
    },
    []
  );

  const encryptForPeers = useCallback(async (text: string, peerUserIds: string[]) => {
    const envelopes: MessageEnvelopes = {};
    for (const peerId of peerUserIds) {
      const key = keyStore.getSharedKey(peerId);
      if (!key) continue;
      const enc = await encryptMessage(text, key);
      envelopes[peerId] = enc;
    }
    return envelopes;
  }, []);

  const wipe = useCallback(() => {
    keyStore.wipe();
    setIsReady(false);
    setPublicKeyBase64('');
  }, []);

  return {
    isReady,
    publicKeyBase64,
    initialize,
    establishSharedKey,
    encrypt,
    encryptForPeers,
    decrypt,
    wipe,
  };
}
