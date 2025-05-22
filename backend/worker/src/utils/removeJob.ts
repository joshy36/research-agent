import { supabase } from '../../../libs/supabase.js';
import { Context } from '../../../libs/types.js';

export async function removeJob(context: Context) {
  const { data: queueRows, error: queueError } = await supabase
    .from('queue')
    .select('*')
    .eq('task_id', context.taskId)
    .eq('state', 'processPaper');

  if (queueError) {
    console.error('Error fetching queue rows:', queueError);
    throw queueError;
  }

  if (queueRows && queueRows.length > 0) {
    const currentQueueRow = queueRows.find(
      (row) => row.context.article?.pmcid === context.article?.pmcid
    );

    if (currentQueueRow) {
      const { error: deleteError } = await supabase
        .from('queue')
        .delete()
        .eq('id', currentQueueRow.id);

      if (deleteError) {
        console.error('Error deleting queue row:', deleteError);
        throw deleteError;
      }
      console.log(`Deleted queue row for PMCID: ${context.article?.pmcid}`);
    }
  }
}
