/** Maps driver errors into actionable hints (shown in dev API responses). */
export function mongoConnectUserHint(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes('querySrv') && !msg.includes('_mongodb._tcp')) return undefined;

  return [
    'Atlas SRV DNS lookup failed on this machine.',
    'Try adding to .env.local: MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 then restart npm run dev.',
    'Or in Atlas → Connect → use the standard mongodb:// connection string (not mongodb+srv).',
    'Also check VPN, firewall, antivirus, or switch DNS to 8.8.8.8 in Windows network settings.',
  ].join(' ');
}
