import 'dotenv/config';
import express, { Request, Response } from 'express';
import { sendToQueue, getQueueStatus, purgeQueue } from './rabbitmq.js';
import { supabase } from './supabase.js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { handleChatRequest } from './chat.js';

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

async function streamResponse(
  aiResponse: globalThis.Response,
  expressResponse: Response
) {
  for (const [key, value] of aiResponse.headers.entries()) {
    expressResponse.setHeader(key, value);
  }

  expressResponse.status(aiResponse.status);

  const reader = aiResponse.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    expressResponse.write(value);
  }
  expressResponse.end();
}

app.post('/queue', async (req: Request, res: Response) => {
  try {
    const { message, user } = req.body as { message?: string; user?: string };

    if (!message || !user) {
      res.status(400).json({
        error: 'Missing required fields',
        details: !message ? 'Message is required' : 'User ID is required',
      });
      return;
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({ message, state: 'parseQuery', user_id: user })
      .select('task_id')
      .single();

    if (taskError) throw taskError;

    const { object } = await generateObject({
      model: google('gemini-1.5-flash-latest'),
      schema: z.object({ title: z.string() }),
      prompt: `Generate a short, descriptive title (max 5 words) for this research query: ${message}`,
    });

    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        user_id: user,
        task_id: taskData.task_id,
        title: object.title,
      })
      .select('id')
      .single();

    if (chatError) throw chatError;

    const { error: messageError } = await supabase.from('messages').insert({
      chat_id: chatData.id,
      content: message,
      role: 'user',
    });

    if (messageError) throw messageError;

    await sendToQueue({
      taskId: taskData.task_id,
      message,
      state: 'parseQuery',
    });

    res.status(200).json({
      status: 'Message queued',
      taskId: taskData.task_id,
      chatId: chatData.id,
    });
  } catch (error) {
    console.error('Queue error:', error);
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
    console.error('Queue status error:', error);
    res.status(500).json({
      error: 'Failed to get queue status',
      details: (error as Error).message,
    });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const response = await handleChatRequest(req);
    await streamResponse(response, res);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to handle chat request',
      details: (error as Error).message,
    });
  }
});

app.post('/queue/purge', async (_req: Request, res: Response) => {
  try {
    await purgeQueue();
    res.status(200).json({ status: 'Queue purged successfully' });
  } catch (error) {
    console.error('Queue purge error:', error);
    res.status(500).json({
      error: 'Failed to purge queue',
      details: (error as Error).message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
