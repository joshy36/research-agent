import { googleProvider } from '@/providers/google';
import { mastra } from '@/src/mastra';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { NextResponse } from 'next/server';

// Helper function to process chunks in batches
async function embedInBatches(chunks: { text: string }[], batchSize: number) {
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const { embeddings: batchEmbeddings } = await embedMany({
      model: googleProvider.textEmbeddingModel('text-embedding-004'),
      values: batch.map((chunk) => chunk.text),
    });
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}

export async function POST(request: Request) {
  try {
    // Load the paper
    const paperUrl = 'https://arxiv.org/html/1706.03762';
    const response = await fetch(paperUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch paper: ${response.status}`);
    }
    const paperText = await response.text();

    // Create document and chunk it
    const doc = MDocument.fromText(paperText);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      size: 512,
      overlap: 50,
      separator: '\n',
    });

    // Generate embeddings in batches of 100
    const embeddings = await embedInBatches(chunks, 100);

    // Get the vector store instance from Mastra
    const vectorStore = mastra.getVector('pgVector');

    // Create an index for our paper chunks
    await vectorStore.createIndex({
      indexName: 'papers',
      dimension: 768, // text-embedding-004 outputs 768-dimensional embeddings
    });

    // Store embeddings
    await vectorStore.upsert({
      indexName: 'papers',
      vectors: embeddings,
      metadata: chunks.map((chunk) => ({
        text: chunk.text,
        source: 'transformer-paper',
      })),
    });

    return NextResponse.json(
      {
        success: true,
        chunkCount: chunks.length,
        message: 'Paper embedded successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error processing paper:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
