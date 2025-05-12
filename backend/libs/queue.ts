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

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

async function releaseStaleLocks() {
  const { error } = await supabase
    .from('queue')
    .update({ worker_id: null })
    .lt('updated_at', new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString())
    .not('worker_id', 'is', null);

  if (error) {
    console.error('Error releasing stale locks:', error);
  }
}

export async function sendToQueue(context: Context) {
  console.log(
    `Sending task ${context.taskId} to queue with state: ${context.state}`
  );

  const { error } = await supabase.from('queue').insert({
    task_id: context.taskId,
    state: context.state,
    context: context,
    env: ENV,
  });

  if (error) {
    console.error('Error sending to queue:', error);
    throw error;
  }

  console.log(`Successfully queued task ${context.taskId}`);
}

export async function processNextTask(): Promise<Task | null> {
  try {
    // First, release any stale locks
    await releaseStaleLocks();

    const { data, error } = await supabase
      .from('queue')
      .update({
        worker_id: WORKER_ID,
        updated_at: new Date().toISOString(),
      })
      .select('id, task_id, state, context')
      // @ts-ignore
      .is('worker_id', null)
      .eq('env', ENV)
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
