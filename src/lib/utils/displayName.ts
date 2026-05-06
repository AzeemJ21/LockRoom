/** Deterministic anonymous handle derived from the ephemeral user id (no PII). */
export function displayNameFromUserId(userId: string): string {
  const tail = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
  return `cipher-${tail || 'anon'}`;
}
