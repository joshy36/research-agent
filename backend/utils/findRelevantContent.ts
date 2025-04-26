import { googleProvider } from './generateEmbedding.js';
import { supabase } from '../supabase.js';
import { embed } from 'ai';

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: googleProvider.textEmbeddingModel('text-embedding-004'),
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (
  userQuery: string,
  chatId: string
) => {
  console.log('findRelevantContent: ', userQuery);
  const userQueryEmbedded = await generateEmbedding(userQuery);

  const { data: resources, error: resourcesError } = await supabase
    .from('chat_resources')
    .select('resource_id')
    .eq('chat_id', chatId);

  if (resourcesError) {
    console.error('Error fetching chat resources:', resourcesError);
    throw new Error(
      `Failed to fetch chat resources: ${resourcesError.message}`
    );
  }

  if (!resources || resources.length === 0) {
    console.log('No resources found for chat:', chatId);
    return [];
  }

  const resourceIds = resources.map(
    (resource: { resource_id: string }) => resource.resource_id
  );

  const { data: similarGuides, error } = await supabase.rpc(
    'match_embeddings',
    {
      query_embedding: userQueryEmbedded,
      match_threshold: 0.6,
      match_count: 10,
      resource_ids: resourceIds,
    }
  );

  console.log('SIMILAR');
  console.log(similarGuides);
  console.log('error: ', error);

  return similarGuides;
};
