import 'dotenv/config';
import { z } from 'zod';
import { generateObject } from 'ai';
import { prompt } from './prompt.js';
import { Context } from '../../libs/types.js';
import { supabase } from '../../libs/supabase.js';
import {
  processNextTask,
  releaseTaskLock,
  sendToQueue,
} from '../../libs/queue.js';
import {
  fetchArticleDetails,
  fetchArticlesMetadata,
} from './utils/fetchArticlesMetadata.js';
import { chunkAndEmbedPaper } from './utils/generateEmbedding.js';
import { toMeshHeading } from './utils/toMeshHeading.js';
import { openrouter } from '../../libs/openrouter.js';
import { removeJob } from './utils/removeJob.js';
import { triggerInitialChatMessage } from '../../libs/triggerInitialChatMessage.js';

async function processTask(task: {
  id: number;
  taskId: string;
  state: string;
  context: Context;
}) {
  try {
    const context = task.context;
    console.log(`Processing task ${task.taskId} in state ${context.state}`);

    switch (context.state) {
      case 'parseQuery': {
        const { object } = await generateObject({
          model: openrouter.chat('gpt-4o'),
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
            updatedKeyTerms.push(term);
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

        await supabase
          .from('queue')
          .delete()
          .eq('task_id', context.taskId)
          .eq('state', 'parseQuery');
        break;
      }
      case 'fetchMetadata': {
        console.log('Step 2: Fetching articles metadata...');
        const allPmcids = await fetchArticlesMetadata(context);

        const articles = await fetchArticleDetails(allPmcids);

        console.log('Articles done');
        await supabase
          .from('tasks')
          .update({
            state: 'processPaper',
            total_articles: articles.length,
            processed_articles: 0,
          })
          .eq('task_id', context.taskId);

        for (const article of articles) {
          await sendToQueue({
            ...context,
            article: article,
            state: 'processPaper',
          });
        }
        await supabase
          .from('queue')
          .delete()
          .eq('task_id', context.taskId)
          .eq('state', 'fetchMetadata');
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
                `Failed to fetch paper ${context.article?.pmid}: ${response.status}. Removing from total...`
              );
              // Decrement total_articles since this article won't be processed
              await supabase
                .from('tasks')
                .update({
                  total_articles: supabase.rpc('decrement_total_articles', {
                    task_id_param: context.taskId,
                  }),
                })
                .eq('task_id', context.taskId);

              await removeJob(context);

              return; // Skip this article and continue with others
            }
            const paperJson = await response.json();
            resourceId = await chunkAndEmbedPaper(paperJson, context, paperUrl);
          } catch (error) {
            console.log(
              `Error processing paper ${context.article?.pmid}: ${error}. Removing from total...`
            );
            // Decrement total_articles since this article won't be processed
            console.log(
              `Decrementing total articles for task ${context.taskId}...`
            );
            const { data: newCount, error: decrementError } =
              await supabase.rpc('decrement_total_articles', {
                task_id_param: context.taskId,
              });

            if (decrementError) {
              console.error(
                'Error decrementing total articles:',
                decrementError
              );
              throw decrementError;
            }

            await removeJob(context);

            console.log(`New total articles count: ${newCount}`);
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

        // Get current task state for verification
        const { data: currentTask, error: taskError } = await supabase
          .from('tasks')
          .select('processed_articles, total_articles, state')
          .eq('task_id', context.taskId)
          .single();

        if (taskError) {
          console.error('Error fetching task state:', taskError);
        } else {
          console.log('Current task state:', currentTask);
        }
        break;
      }
      default:
        console.log('Unknown state:', context.state);
    }
  } catch (error) {
    console.error('Error processing task:', error);
    try {
      // Attempt to release the task lock
      await releaseTaskLock(task.taskId);

      // If the error is recoverable, requeue the task
      if (error instanceof Error && !error.message.includes('fatal')) {
        console.log(`Requeueing task ${task.taskId} due to recoverable error`);
        await sendToQueue({
          ...task.context,
          state: task.context.state, // Keep the same state
        });
      } else {
        // For fatal errors, mark the task as failed
        console.error(`Task ${task.taskId} failed with fatal error:`, error);
        await supabase
          .from('tasks')
          .update({
            state: 'Failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('task_id', task.taskId);
      }
    } catch (releaseError) {
      console.error('Failed to handle task error:', releaseError);
      // If we can't even release the lock, we should alert about this
      console.error(
        'CRITICAL: Task lock could not be released for task:',
        task.taskId
      );
    }
  }
}

async function startWorker() {
  console.log('Worker started. Waiting for tasks...');

  // Start the completion checker in the background
  startCompletionChecker();

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

async function startCompletionChecker() {
  console.log('Starting completion checker...');

  while (true) {
    try {
      // Check for tasks that should be complete
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('task_id, processed_articles, total_articles, state, message')
        .neq('state', 'Complete')
        .neq('state', 'generatingResponse'); // Don't process tasks already in generatingResponse

      if (error) {
        console.error('Error checking for completed tasks:', error);
      } else if (tasks && tasks.length > 0) {
        // Filter tasks where processed_articles >= total_articles
        const completedTasks = tasks.filter(
          (task) =>
            task.processed_articles !== null &&
            task.total_articles !== null &&
            task.processed_articles > 0 &&
            task.total_articles > 0 &&
            task.processed_articles >= task.total_articles
        );

        if (completedTasks.length > 0) {
          console.log(
            `Found ${completedTasks.length} tasks that should be complete`
          );

          for (const task of completedTasks) {
            console.log('Task details:', {
              task_id: task.task_id,
              state: task.state,
              processed_articles: task.processed_articles,
              total_articles: task.total_articles,
              completion_ratio: `${task.processed_articles}/${task.total_articles}`,
            });

            try {
              await supabase.from('queue').delete().eq('task_id', task.task_id);
              console.log(
                `Successfully completed/deleted jobs for task ${task.task_id} in the queue.`
              );

              const { error: updateError } = await supabase
                .from('tasks')
                .update({
                  state: 'generatingResponse',
                  processed_articles: task.processed_articles,
                })
                .eq('task_id', task.task_id);

              if (updateError) {
                console.error('Error updating task state:', updateError);
                continue;
              }

              console.log('Successfully marked task as generatingResponse:', {
                task_id: task.task_id,
                final_state: 'generatingResponse',
                final_processed_articles: task.processed_articles,
              });

              try {
                console.log(
                  'Triggering initial chat message for task:',
                  task.task_id
                );
                await triggerInitialChatMessage(task.task_id);
              } catch (error) {
                console.error('Error triggering initial chat message:', error);
              }
            } catch (error) {
              console.error('Error processing task:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in completion checker:', error);
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

startWorker().catch(console.error);
