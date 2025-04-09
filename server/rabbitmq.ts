import * as amqp from 'amqplib';

const QUEUE_NAME = 'task_queue';
const RABBITMQ_URL = 'amqp://localhost:5672';

let channel: amqp.Channel | null = null;

async function connectRabbitMQ(): Promise<amqp.Channel> {
  if (channel) return channel;
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    throw error;
  }
}

export async function sendToQueue(message: string): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
  console.log('Queued:', message);
}

export async function getQueueStatus(): Promise<{
  messageCount: number;
  consumerCount: number;
}> {
  const ch = await connectRabbitMQ();
  const queue = await ch.checkQueue(QUEUE_NAME);
  return {
    messageCount: queue.messageCount,
    consumerCount: queue.consumerCount,
  };
}
