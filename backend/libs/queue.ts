import { supabase } from './supabase.js';
import { Context } from './types.js';
import { v4 as uuidv4 } from 'uuid';

const WORKER_ID = uuidv4();

interface Task {
  id: number;
  taskId: string;
  state: string;
  context: any;
}

export async function sendToQueue(context: Context) {
  console.log(
    `Sending task ${context.taskId} to queue with state: ${context.state}`
  );

  const { error } = await supabase.from('queue').insert({
    task_id: context.taskId,
    state: context.state,
    context: context,
  });

  if (error) {
    console.error('Error sending to queue:', error);
    throw error;
  }

  console.log(`Successfully queued task ${context.taskId}`);
}

export async function processNextTask(): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('queue')
      .update({ worker_id: WORKER_ID })
      .select('id, task_id, state, context')
      // @ts-ignore
      .is('worker_id', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        // No tasks available
        return null;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0]; // Take the first (and only) row
    return {
      id: row.id,
      taskId: row.task_id,
      state: row.state,
      context: row.context,
    };
  } catch (error) {
    console.error('Error getting next task:', error);
    return null;
  }
}

export async function completeTask(taskId: string) {
  console.log(`Completing task ${taskId}...`);
  const { error } = await supabase.from('queue').delete().eq('task_id', taskId);

  if (error) {
    console.error('Error completing task:', error);
    throw error;
  }
  console.log(`Successfully completed task ${taskId}`);
}

export async function releaseTaskLock(taskId: string) {
  const { error } = await supabase
    .from('queue')
    .update({ worker_id: null })
    .eq('task_id', taskId);

  if (error) {
    console.error('Error releasing task lock:', error);
    throw error;
  }
}
