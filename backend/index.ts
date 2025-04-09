import 'dotenv/config';
import express, { Request, Response } from 'express';
import { sendToQueue, getQueueStatus } from './rabbitmq.js';
import { supabase } from './supabase.js';

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
      .insert({ message, state: 'step1', user_id: user })
      .select('task_id')
      .single();

    if (error) throw error;

    const taskId = data.task_id;

    await sendToQueue({
      taskId,
      message,
      state: 'step1',
    });
    res.status(200).json({ status: 'Message queued', taskId });
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

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
