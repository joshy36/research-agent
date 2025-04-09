import { generateObject } from 'ai';
import * as amqp from 'amqplib';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { prompt } from './prompt.js';
import 'dotenv/config';
import { sendToQueue } from './rabbitmq.js';
import { Context } from './types.js';
import { fetchArticlesMetadata } from './fetchArticlesMetadata.js';

const QUEUE_NAME = 'task_queue';
const RABBITMQ_URL = 'amqp://localhost:5672';

async function startWorker() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('Worker started. Waiting for messages...');

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg) {
          const context = JSON.parse(msg.content.toString()).context as Context;
          console.log('Received:', context);

          switch (context.state) {
            case 'step1': {
              const { object } = await generateObject({
                model: google('gemini-1.5-flash-latest'),
                schema: z.object({
                  parsedQuery: z.object({
                    rawTerms: z.array(z.string()),
                    keyTerms: z.array(z.string()),
                  }),
                  note: z.string().optional(),
                }),
                prompt: 'User query: ' + context.message + ' ' + prompt,
              });

              console.log(object);
              Object.assign(context, {
                parsedQuery: object.parsedQuery,
                state: 'step2',
              });
              await sendToQueue(context);

              break;
            }
            case 'step2': {
              console.log('STEP2!!!');
              const articles = await fetchArticlesMetadata(context);

              console.log(articles);
              context.state = 'step3';
              break;
            }
            default:
              console.log('Unknown state:', context.state);
          }

          channel.ack(msg); // Acknowledge the message to remove it from the queue
        }
      },
      {
        noAck: false, // Ensure manual acknowledgment
      }
    );

    channel.on('close', () => {
      console.log('Channel closed');
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
    });
  } catch (error) {
    console.error('Error starting worker:', error);
  }
}

startWorker().catch(console.error);
