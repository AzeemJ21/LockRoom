export async function encryptMessage(
  content: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(content);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sharedKey,
    ciphertextBytes
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptFile(
  file: ArrayBuffer,
  sharedKey: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    file
  );
  return {
    ciphertext,
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptFile(
  ciphertext: ArrayBuffer,
  iv: string,
  sharedKey: CryptoKey
): Promise<ArrayBuffer> {
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sharedKey,
    ciphertext
  );
}
