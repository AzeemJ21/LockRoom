/**
 * Ephemeral key material — JS heap only; wiped on demand / tab teardown hooks.
 */
class EphemeralKeyStore {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKeys = new Map<string, CryptoKey>();

  setKeyPair(kp: CryptoKeyPair) {
    this.keyPair = kp;
  }
  getKeyPair() {
    return this.keyPair;
  }

  setSharedKey(peerId: string, key: CryptoKey) {
    this.sharedKeys.set(peerId, key);
  }
  getSharedKey(peerId: string) {
    return this.sharedKeys.get(peerId);
  }

  getFirstSharedKey(): CryptoKey | undefined {
    return this.sharedKeys.values().next().value;
  }

  /** Try decrypting with every established pairwise key (group rooms). */
  *sharedKeyIterable(): IterableIterator<CryptoKey> {
    yield* this.sharedKeys.values();
  }

  wipe() {
    this.keyPair = null;
    this.sharedKeys.clear();
  }
}

export const keyStore = new EphemeralKeyStore();
