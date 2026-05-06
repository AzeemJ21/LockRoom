import dynamic from 'next/dynamic';

/** Avoid flaky SSR vendor chunks for motion-dom under Next 14 + Framer Motion 12 */
const ChatRoom = dynamic(() => import('@/components/chat/ChatRoom').then((m) => m.ChatRoom), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background-primary text-text-secondary">
      Loading room…
    </div>
  ),
});

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code?.toUpperCase() ?? '';
  return <ChatRoom roomCode={code} />;
}
