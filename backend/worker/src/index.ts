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

          // Check if task is complete - either all articles are processed or we have no more articles to process
          if (
            currentTask &&
            currentTask.processed_articles > 0 &&
            currentTask.total_articles > 0 &&
            currentTask.processed_articles >= currentTask.total_articles &&
            currentTask.state !== 'Complete'
          ) {
            // Only update if not already complete
            console.log(
              'Marking task as complete - Processed:',
              currentTask.processed_articles,
              'Total:',
              currentTask.total_articles
            );

            // Update task state to Complete
            const { error: updateError } = await supabase
              .from('tasks')
              .update({
                state: 'Complete',
                processed_articles: currentTask.processed_articles,
              })
              .eq('task_id', context.taskId);

            if (updateError) {
              console.error('Error updating task state:', updateError);
            } else {
              console.log('Successfully marked task as complete');
              await completeTask(task.taskId);
            }
            return;
          }
        }

        // If we get here, task is not complete
        console.log('Task not complete:', {
          processedArticles: currentTask?.processed_articles,
          totalArticles: currentTask?.total_articles,
          currentState: currentTask?.state,
        });
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
        .select('task_id, processed_articles, total_articles, state')
        .neq('state', 'Complete');

      if (error) {
        console.error('Error checking for completed tasks:', error);
      } else if (tasks && tasks.length > 0) {
        // Filter tasks where processed_articles >= total_articles
        const completedTasks = tasks.filter(
          (task) =>
            task.processed_articles > 0 &&
            task.total_articles > 0 &&
            task.processed_articles >= task.total_articles
        );

        if (completedTasks.length > 0) {
          console.log(
            `Found ${completedTasks.length} tasks that should be complete`
          );

          for (const task of completedTasks) {
            console.log('Completing task:', task.task_id);

            // Update task state to Complete
            const { error: updateError } = await supabase
              .from('tasks')
              .update({
                state: 'Complete',
                processed_articles: task.processed_articles,
              })
              .eq('task_id', task.task_id);

            if (updateError) {
              console.error('Error updating task state:', updateError);
            } else {
              console.log('Successfully marked task as complete');
              await completeTask(task.task_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in completion checker:', error);
    }

    // Wait 3 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

startWorker().catch(console.error);
