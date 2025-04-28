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
import { toMeshHeading } from './utils/toMeshHeading.js';

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

              const updatedKeyTerms: string[] = [];
              for (const term of object.parsedQuery.keyTerms) {
                const meshHeadings = await toMeshHeading(term);
                console.log(`MeSH headings for "${term}":`, meshHeadings);
                if (meshHeadings.length > 0) {
                  updatedKeyTerms.push(meshHeadings[0]!);
                }
              }
              object.parsedQuery.keyTerms = updatedKeyTerms;

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
                .update({
                  state: 'processPaper',
                  total_articles: articles.articles.length,
                  processed_articles: 0,
                })
                .eq('task_id', context.taskId);

              for (const article of articles.articles) {
                await sendToQueue({
                  ...context,
                  article: article,
                  state: 'processPaper',
                });
              }
              break;
            }
            case 'processPaper': {
              console.log('Step 3: Processing paper and embeddings...');
              const paperUrl = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${context.article?.pmid}/unicode`;
              const { data: existingResource, error } = await supabase
                .from('resources')
                .select('*')
                .eq('source_url', paperUrl);

              if (error) throw error;

              const { data: chat, error: chatError } = await supabase
                .from('chats')
                .select('id')
                .eq('task_id', context.taskId)
                .single();

              if (chatError) throw chatError;

              let resourceId = null;

              if (existingResource?.length > 0) {
                console.log(`Resource already exists for URL: ${paperUrl}`);
                resourceId = existingResource[0].id;
              } else {
                const response = await fetch(paperUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch paper: ${response.status}`);
                }
                const paperJson = await response.json();
                resourceId = await chunkAndEmbedPaper(
                  paperJson,
                  context,
                  paperUrl
                );
              }

              await supabase.from('chat_resources').insert({
                chat_id: chat!.id,
                resource_id: resourceId,
              });

              const { data: result, error: rpcError } = await supabase
                .rpc('increment_processed_articles', {
                  task_id_param: context.taskId,
                })
                .single();

              if (rpcError) throw rpcError;

              if (
                result &&
                typeof result === 'object' &&
                'is_complete' in result &&
                result.is_complete
              ) {
                await supabase
                  .from('tasks')
                  .update({ state: 'Complete' })
                  .eq('task_id', context.taskId);
                console.log(`Task ${context.taskId} completed.`);
              }

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
