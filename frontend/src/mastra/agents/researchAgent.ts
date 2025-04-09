import { googleProvider } from '@/providers/google';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createVectorQueryTool } from '@mastra/rag';
import { z } from 'zod';

export const dynamicVectorQueryTool = createTool({
  id: 'DynamicVectorQueryTool',
  description:
    'Search a vector store for relevant information using a dynamic index name.',
  inputSchema: z.object({
    indexName: z
      .string()
      .describe('The name of the index to query in the vector store'),
  }),
  execute: async ({ context: { indexName } }) => {
    const vectorQueryTool = createVectorQueryTool({
      vectorStoreName: 'pgVector',
      indexName: indexName,
      model: googleProvider.textEmbeddingModel('text-embedding-004'),
    });

    if (!vectorQueryTool?.execute) {
      throw new Error('Vector query tool not properly initialized');
    }
    const result = await vectorQueryTool.execute({ context: 'test' });
    return result;
  },
});

const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'papers',
  model: googleProvider.textEmbeddingModel('text-embedding-004'),
});

export const researchAgent = new Agent({
  name: 'researchAgent',
  instructions: `You are a helpful research assistant that analyzes academic papers and technical documents.
      Use the provided vector query tool to find relevant information from your knowledge base, 
      and provide accurate, well-supported answers based on the retrieved content.
      Focus on the specific content available in the tool and acknowledge if you cannot find sufficient information to answer a question.
      Base your responses only on the content provided, not on general knowledge. Please cite your sources.`,
  model: googleProvider('gemini-2.0-flash-001'),
  tools: {
    dynamicVectorQueryTool,
  },
});
