import { supabase } from './supabase.js';

export async function triggerInitialChatMessage(taskId: string) {
  // Get the task message and chat ID
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('message')
    .eq('task_id', taskId)
    .single();

  if (taskError) throw taskError;

  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('id')
    .eq('task_id', taskId)
    .single();

  if (chatError) throw chatError;

  console.log('Triggering initial chat message for task:', taskId);
  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId: chatData.id,
      messages: [
        {
          role: 'user',
          parts: [{ type: 'text', text: taskData.message }],
        },
      ],
      model: 'gpt-o3-mini',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  console.log('Successfully triggered initial chat message');
}
