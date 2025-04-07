import { googleProvider } from '@/providers/google';
import { Agent } from '@mastra/core/agent';
import { createVectorQueryTool } from '@mastra/rag';

// Create a tool for semantic search over our paper embeddings
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
    vectorQueryTool,
  },
});
