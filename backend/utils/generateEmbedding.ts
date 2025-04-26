import { embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { supabase } from '../supabase.js';
import { Context } from '../types.js';

export const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export function generateSectionChunks(
  json: any
): Array<{ content: string; section: string; offset: number }> {
  const chunks: Array<{ content: string; section: string; offset: number }> =
    [];

  if (!json[0]?.documents?.[0]?.passages) {
    throw new Error('Invalid BioC JSON format: missing documents or passages');
  }

  const passages = json[0].documents[0].passages;
  for (const passage of passages) {
    const section = passage.infons?.section_type || 'unknown'; // Default to 'unknown' if missing
    const offset = passage.offset || 0; // Use offset for reference
    const text = passage.text?.trim();

    if (!text) continue; // Skip empty passages

    // Split into sentences, removing empty ones
    const sentences = text
      .split('.')
      .map((s: string) => s.trim())
      .filter((s: string) => s !== '');
    for (const sentence of sentences) {
      chunks.push({
        content: sentence,
        section,
        offset,
      });
    }
  }

  return chunks;
}

export async function chunkAndEmbedPaper(
  paperJson: any,
  context: Context,
  sourceUrl: string
): Promise<number> {
  try {
    // Step 1: Generate section-based sentence chunks
    const chunks = generateSectionChunks(paperJson);
    if (chunks.length === 0) {
      throw new Error('No valid chunks generated from paper');
    }

    // Step 2: Insert resource (full paper) into Supabase
    const fullText = chunks.map((c) => c.content).join('. '); // Reconstruct full text
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .insert({
        task_id: context.taskId,
        content: fullText,
        source_url: sourceUrl,
        pmid: context.article?.pmid,
        pmcid: context.article?.pmcid,
        journal: context.article?.journal,
        full_text_url: context.article?.fullTextUrl,
        pub_date: context.article?.pubDate,
        title: context.article?.title,
        authors: context.article?.authors,
        offset: 0,
      })
      .select('id')
      .single();

    if (resourceError)
      throw new Error(`Failed to insert resource: ${resourceError.message}`);
    const resourceId = resourceData.id;

    // Step 3: Embed chunks in batches
    const batchSize = 100;
    const embeddingsRecords: Array<{
      resource_id: string;
      content: string;
      embedding: number[];
      section: string;
    }> = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const { embeddings } = await embedMany({
        model: googleProvider.textEmbeddingModel('text-embedding-004'),
        values: batch.map((chunk) => chunk.content),
      });

      // Pair embeddings with chunk metadata
      batch.forEach((chunk, idx) => {
        embeddingsRecords.push({
          resource_id: resourceId,
          content: chunk.content,
          embedding: embeddings[idx] as number[],
          section: chunk.section,
        });
      });
    }

    // Step 4: Insert embeddings into Supabase
    const { error: embeddingError } = await supabase.from('embeddings').insert(
      embeddingsRecords.map((record) => ({
        resource_id: record.resource_id,
        content: record.content,
        embedding: record.embedding,
        section: record.section, // Add section as a column
      }))
    );

    if (embeddingError)
      throw new Error(`Failed to insert embeddings: ${embeddingError.message}`);

    console.log(
      `Embedded ${embeddingsRecords.length} chunks for resource ${resourceId}`
    );
    return resourceId;
  } catch (error) {
    console.error('Error in chunkAndEmbedPaper:', error);
    throw error; // Re-throw for worker to handle
  }
}
