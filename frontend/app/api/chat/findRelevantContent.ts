import { googleProvider } from '@/providers/google';
import { createClient } from '@/supabase/server';
import { embed } from 'ai';

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: googleProvider.textEmbeddingModel('text-embedding-004'),
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  console.log('CONTENT');
  const userQueryEmbedded = await generateEmbedding(userQuery);

  const supabase = await createClient();

  const { data: similarGuides, error } = await supabase.rpc(
    'match_embeddings',
    {
      query_embedding: userQueryEmbedded,
      match_threshold: 0.6, // Similarity threshold (adjust as needed)
      match_count: 4, // Limit to 4 results
    },
  );

  console.log('similar: ', similarGuides);
  console.log('error: ', error);

  const test = similarGuides.map((guide: any) => ({
    name: guide.content,
    similarity: guide.similarity,
  }));

  console.log('test: ', test);

  return similarGuides.map((guide: any) => ({
    name: guide.content,
    similarity: guide.similarity,
  }));
};

// CREATE FUNCTION match_embeddings(
//     query_embedding VECTOR(768),
//     match_threshold FLOAT,
//     match_count INT
//   )
//   RETURNS TABLE (
//     id UUID,
//     content TEXT,
//     similarity FLOAT
//   )
//   LANGUAGE plpgsql
//   AS $$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       e.id,
//       e.content,
//       1 - (e.embedding <=> query_embedding) AS similarity
//     FROM embeddings e
//     WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
//     ORDER BY e.embedding <=> query_embedding
//     LIMIT match_count;
//   END;
//   $$;
