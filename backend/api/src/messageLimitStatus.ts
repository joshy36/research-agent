import { supabase } from '../../libs/supabase.js';
import type { Request, Response } from 'express';

export async function getUserMessageLimitStatus(req: Request, res: Response) {
  try {
    const { chatId } = req.query;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }
    // Get user_id for the chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chatId)
      .single();

    if (chatError || !chatData?.user_id) {
      console.log('[messageLimitStatus] Chat or user not found');
      return res.status(404).json({ error: 'Chat or user not found' });
    }

    const { data: userChats, error: userChatsError } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', chatData.user_id);

    if (userChatsError) throw userChatsError;
    const chatIds = userChats?.map((c) => c.id) || [];

    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { count: userMessageCount, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .in('chat_id', chatIds)
      .gte('created_at', oneWeekAgo);

    if (countError) throw countError;
    // Find the date of the oldest message in the window (for reset)
    const { data: oldestMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('role', 'user')
      .in('chat_id', chatIds)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: true })
      .limit(1);
    let resetDate = null;
    if (
      oldestMessage &&
      oldestMessage.length > 0 &&
      oldestMessage[0]?.created_at
    ) {
      resetDate = new Date(
        new Date(oldestMessage[0].created_at).getTime() +
          7 * 24 * 60 * 60 * 1000
      );
    }

    return res.status(200).json({
      count: userMessageCount ?? 0,
      limit: 5,
      resetDate,
    });
  } catch (error) {
    console.error('[messageLimitStatus] Error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
