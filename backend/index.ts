import 'dotenv/config';
import express, { Request, Response } from 'express';
import { sendToQueue, getQueueStatus, purgeQueue } from './rabbitmq.js';
import { supabase } from './supabase.js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

app.post('/queue', async (req: Request, res: Response) => {
  try {
    const { message, user } = req.body as { message?: string; user?: string };
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!user) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({ message, state: 'parseQuery', user_id: user })
      .select('task_id')
      .single();

    const { object } = await generateObject({
      model: google('gemini-1.5-flash-latest'),
      schema: z.object({
        title: z.string(),
      }),
      prompt: `Generate a short, descriptive title (max 5 words) for this research query: ${message}`,
    });

    const title = object.title;

    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        user_id: user,
        task_id: data!.task_id,
        title: title,
      })
      .select('id')
      .single();

    if (chatError) throw chatError;
    if (error) throw error;

    const { error: messageError } = await supabase.from('messages').insert({
      chat_id: chatData.id,
      content: message,
      role: 'user',
    });

    if (messageError) throw messageError;

    const taskId = data.task_id;

    await sendToQueue({
      taskId,
      message,
      state: 'parseQuery',
    });
    res
      .status(200)
      .json({ status: 'Message queued', taskId: taskId, chatId: chatData.id });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to queue message',
      details: (error as Error).message,
    });
  }
});

app.get('/queue/status', async (_req: Request, res: Response) => {
  try {
    const status = await getQueueStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue status',
      details: (error as Error).message,
    });
  }
});

app.post('/queue/purge', async (_req: Request, res: Response) => {
  try {
    await purgeQueue();
    res.status(200).json({ status: 'Queue purged successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to purge queue',
      details: (error as Error).message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
