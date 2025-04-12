import 'dotenv/config';
import * as amqp from 'amqplib';

import { z } from 'zod';
import { generateObject } from 'ai';
import { prompt } from './prompt.js';
import { Context } from './types.js';
import { google } from '@ai-sdk/google';
import { supabase } from './supabase.js';
import { sendToQueue } from './rabbitmq.js';
import { fetchArticlesMetadata } from './utils/fetchArticlesMetadata.js';
import { chunkAndEmbedPaper } from './utils/generateEmbedding.js';

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
        if (!msg) return;

        try {
          const context = JSON.parse(msg.content.toString()).context as Context;
          console.log('Received:', context);

          switch (context.state) {
            case 'parseQuery': {
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

              await supabase
                .from('tasks')
                .update({
                  state: 'fetchMetadata',
                  parsed_query: object.parsedQuery,
                })
                .eq('task_id', context.taskId);

              await sendToQueue({
                ...context,
                parsedQuery: object.parsedQuery,
                state: 'fetchMetadata',
              });
              break;
            }
            case 'fetchMetadata': {
              console.log('Step 2: Fetching articles metadata...');
              const articles = await fetchArticlesMetadata(context);

              console.log('Articles done');
              await supabase
                .from('tasks')
                .update({ state: 'processPaper', articles })
                .eq('task_id', context.taskId);

              await sendToQueue({
                ...context,
                ...articles,
                state: 'processPaper',
              });
              break;
            }
            case 'processPaper': {
              console.log('Step 3: Processing paper and embeddings...');
              const paperUrl =
                'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/30248967/unicode';
              const { data: existingResource, error } = await supabase
                .from('resources')
                .select('*')
                .eq('source_url', paperUrl);

              if (error) throw error;

              if (existingResource?.length > 0) {
                console.log(`Resource already exists for URL: ${paperUrl}`);
                console.log('finalize1');
                await supabase
                  .from('tasks')
                  .update({ state: 'Complete' })
                  .eq('task_id', context.taskId);

                break; // Continue to ack
              }

              const response = await fetch(paperUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch paper: ${response.status}`);
              }
              const paperJson = await response.json();

              await chunkAndEmbedPaper(paperJson, context.taskId, paperUrl);

              await supabase
                .from('tasks')
                .update({ state: 'Complete' })
                .eq('task_id', context.taskId);

              console.log('Step 3 done: Resource and embeddings stored.');
              break;
            }

            default:
              console.log('Unknown state:', context.state);
          }

          console.log('Acking message:', context.taskId);
          channel.ack(msg); // Acknowledge after successful processing
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, false); // Discard on error (no requeue)
        }
      },
      {
        noAck: false, // Manual acknowledgment
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
