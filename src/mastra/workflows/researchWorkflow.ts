import { Workflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { agentResponse } from './steps/agentResponse';
import { embedPapers } from './steps/embedPapers';
import { fetchArticlesMetadata } from './steps/fetchArticlesMetadata';
import { generateMeshTerms } from './steps/generateMeshTerms';

export const researchWorkflow = new Workflow({
  name: 'pubmed-research-workflow',
  triggerSchema: z.object({
    query: z.string(),
  }),
});

researchWorkflow
  .step(generateMeshTerms)
  .then(fetchArticlesMetadata)
  .then(embedPapers)
  .then(agentResponse)
  .commit();
