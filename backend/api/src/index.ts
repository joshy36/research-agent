import 'dotenv/config';
import express, { Request, Response } from 'express';
import { sendToQueue } from '../../libs/queue.js';
import { supabase } from '../../libs/supabase.js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { handleChatRequest } from './chat.js';
import { toNodeStream } from './utils/stream.js';

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' }));

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
      parts: [
        {
          type: 'text',
          text: message,
        },
      ],
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
    const { data, error } = await supabase.from('queue').select('state');

    if (error) throw error;

    const status = {
      total: data.length,
      byState: data.reduce(
        (acc: Record<string, number>, curr: { state: string }) => {
          acc[curr.state] = (acc[curr.state] || 0) + 1;
          return acc;
        },
        {}
      ),
    };

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
    const aiResponse = await handleChatRequest(req); // returns a WHATWG Response

    // Set headers explicitly
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-transform');
    res.setHeader(
      'Access-Control-Allow-Origin',
      process.env.FRONTEND_URL ?? '*'
    );
    res.status(aiResponse.status);

    if (!aiResponse.body) {
      throw new Error('No response body from AI stream');
    }

    // Pipe stream to Express response
    const nodeStream = toNodeStream(aiResponse.body);
    nodeStream.pipe(res);
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
    const { error } = await supabase.from('queue').delete().neq('id', 0);
    if (error) throw error;
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
