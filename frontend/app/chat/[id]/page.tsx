// app/chat/[id]/page.tsx
import { supabase } from '@/providers/supabase';
import ClientChatPage from './ClientChatPage';

export default async function ChatPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;

  // Fetch messages from Supabase
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    throw new Error('Failed to load messages');
  }

  // Convert database rows to chat messages
  function rowToChatMessage(row: any) {
    return {
      id: row.id.toString(),
      role: row.role, // 'user' | 'assistant'
      content: row.content ?? row.parts?.[0]?.text ?? '', // fall back if needed
      parts: row.parts ?? [{ type: 'text', text: row.content }],
      createdAt: new Date(row.created_at), // camel-case!
    };
  }

  const initialMessages = messagesData.map(rowToChatMessage);

  return <ClientChatPage params={params} initialMessages={initialMessages} />;
}
