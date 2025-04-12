import * as amqp from 'amqplib';
import { Context } from './types.js';

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

export async function sendToQueue(context: Context): Promise<void> {
  const ch = await connectRabbitMQ();
  const messageWithState = {
    context: context,
  };
  ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(messageWithState)), {
    persistent: true,
  });
  console.log('Queued:', messageWithState);
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

export const purgeQueue = async () => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  try {
    await channel.purgeQueue(QUEUE_NAME);
    console.log('Queue purged');
  } finally {
    await channel.close();
    await connection.close();
  }
};
