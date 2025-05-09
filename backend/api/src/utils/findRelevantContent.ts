import { googleProvider } from '../../../worker/src/utils/generateEmbedding.js';
import { supabase } from '../../../libs/supabase.js';
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
    .select('resource_id, number')
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
    (resource: { resource_id: string; number: number }) => resource.resource_id
  );

  const { data: similarGuides, error } = await supabase.rpc(
    'match_embeddings',
    {
      query_embedding: userQueryEmbedded,
      match_threshold: 0.6,
      match_count: 20,
      resource_ids: resourceIds,
    }
  );

  // Map the resource numbers to the matched content
  const contentWithNumbers = similarGuides.map((guide: any) => {
    const resource = resources.find(
      (r: any) => r.resource_id === guide.resource_id
    );
    return {
      ...guide,
      resource_number: resource?.number,
    };
  });

  console.log('SIMILAR');
  console.log(contentWithNumbers.map((x: any) => x.content));
  console.log('error: ', error);

  return contentWithNumbers;
};
