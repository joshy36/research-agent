import { supabase } from '@/providers/supabase';
import ClientChatPage from './ClientChatPage';

export default async function ChatPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;

  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('*, tasks(*)')
    .eq('id', params.id)
    .single();

  if (chatError) {
    console.error('Failed to fetch chat:', chatError);
    throw new Error('Failed to load chat');
  }

  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    throw new Error('Failed to load messages');
  }

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

  return (
    <ClientChatPage
      params={params}
      initialMessages={initialMessages}
      initialChatData={{
        title: chatData.title || 'Research Chat',
        createdAt: chatData.created_at,
        taskId: chatData.task_id,
      }}
    />
  );
}
