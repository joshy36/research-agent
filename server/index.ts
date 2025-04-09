import express, { Request, Response } from 'express';
import { sendToQueue, getQueueStatus } from './rabbitmq.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.post('/queue', async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    await sendToQueue({
      message,
      state: 'step1',
      parsedQuery: { keyTerms: [], rawTerms: [] },
    });
    res.status(200).json({ status: 'Message queued', message });
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
