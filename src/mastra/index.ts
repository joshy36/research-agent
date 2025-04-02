import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { PgVector } from '@mastra/pg';
import { weatherAgent } from './agents';
import { pubMedResearchAgent } from './agents/pubMedResearchAgent';
import { researchAgent } from './agents/researchAgent';
import { myWorkflow, researchWorkflow } from './workflows';

const pgVector = new PgVector(process.env.POSTGRES_CONNECTION_STRING!);

export const mastra = new Mastra({
  workflows: { myWorkflow, researchWorkflow },
  agents: { weatherAgent, pubMedResearchAgent, researchAgent },
  vectors: { pgVector },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
