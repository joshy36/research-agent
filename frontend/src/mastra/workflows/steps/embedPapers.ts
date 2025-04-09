import { googleProvider } from '@/providers/google';
import { Step } from '@mastra/core';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { mastra } from '../..';

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

export const embedPapers = new Step({
  id: 'embedPaper',
  execute: async ({ context }) => {
    // use pmid not pmcid
    const paperUrl =
      'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/30248967/unicode';

    // https://www.ncbi.nlm.nih.gov/pmc/articles/6212970/
    //'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/30248967/unicode';

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
  },
});
