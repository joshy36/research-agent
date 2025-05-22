import { supabase } from '../../../libs/supabase.js';
import type { Request, Response } from 'express';

export async function getUserMessageLimitStatus(req: Request, res: Response) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const resolvedUserId = userId as string;

    if (resolvedUserId === '637ce53d-9787-4dea-9062-0f4f9c0c452c') {
      return res.status(200).json({
        count: 0,
        limit: 100000,
        resetDate: null,
      });
    }

    const { data: userChats, error: userChatsError } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', resolvedUserId);

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

    let resetDate = null;
    if ((userMessageCount ?? 0) > 0 && chatIds.length > 0) {
      const { data: oldestMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('role', 'user')
        .in('chat_id', chatIds)
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: true })
        .limit(1);

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
