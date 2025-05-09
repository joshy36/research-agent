import 'dotenv/config';
import { z } from 'zod';
import { generateObject } from 'ai';
import { prompt } from './prompt.js';
import { Context } from '../../libs/types.js';
import { google } from '@ai-sdk/google';
import { supabase } from '../../libs/supabase.js';
import {
  processNextTask,
  completeTask,
  releaseTaskLock,
  sendToQueue,
} from '../../libs/queue.js';
import { fetchArticlesMetadata } from './utils/fetchArticlesMetadata.js';
import { chunkAndEmbedPaper } from './utils/generateEmbedding.js';
import { toMeshHeading } from './utils/toMeshHeading.js';

async function processTask(task: {
  id: number;
  taskId: string;
  state: string;
  context: Context;
}) {
  try {
    const context = task.context;

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
          console.log(`Converting term "${term}" to MeSH headings...`);
          console.log(
            `Found ${meshHeadings.length} MeSH headings:`,
            meshHeadings
          );

          if (meshHeadings.length > 0) {
            const selectedHeading = meshHeadings[0]!;
            console.log(`Selected primary MeSH heading: "${selectedHeading}"`);
            updatedKeyTerms.push(selectedHeading);
          } else {
            console.log(`No MeSH headings found for term "${term}"`);
          }
        }
        console.log('Final MeSH headings:', updatedKeyTerms);
        object.parsedQuery.keyTerms = updatedKeyTerms;

        console.log(
          `Updating task ${context.taskId} state to fetchMetadata...`
        );
        await supabase
          .from('tasks')
          .update({
            state: 'fetchMetadata',
            parsed_query: object.parsedQuery,
          })
          .eq('task_id', context.taskId);

        console.log(`Queueing task ${context.taskId} for metadata fetching...`);
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
          try {
            const response = await fetch(paperUrl);
            if (!response.ok) {
              console.log(
                `Failed to fetch paper ${context.article?.pmid}: ${response.status}. Skipping...`
              );
              // Increment processed articles count even for failed papers
              await supabase.rpc('increment_processed_articles', {
                task_id_param: context.taskId,
              });
              return; // Skip this article and continue with others
            }
            const paperJson = await response.json();
            resourceId = await chunkAndEmbedPaper(paperJson, context, paperUrl);
          } catch (error) {
            console.log(
              `Error processing paper ${context.article?.pmid}: ${error}. Skipping...`
            );
            // Increment processed articles count even for failed papers
            await supabase.rpc('increment_processed_articles', {
              task_id_param: context.taskId,
            });
            return; // Skip this article and continue with others
          }
        }

        await supabase.from('chat_resources').insert({
          chat_id: chat!.id,
          resource_id: resourceId,
          number: await supabase
            .rpc('get_next_chat_resource_number', {
              chat_id_param: chat!.id,
            })
            .then(({ data }) => data),
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
          await completeTask(task.taskId);
        }
        break;
      }
      default:
        console.log('Unknown state:', context.state);
    }
  } catch (error) {
    console.error('Error processing task:', error);
    await releaseTaskLock(task.taskId);
  }
}

async function startWorker() {
  console.log('Worker started. Waiting for tasks...');

  while (true) {
    try {
      const task = await processNextTask();

      if (task) {
        console.log('Processing task:', task.taskId);
        await processTask(task);
      } else {
        // No tasks available, wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in worker loop:', error);
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

startWorker().catch(console.error);
