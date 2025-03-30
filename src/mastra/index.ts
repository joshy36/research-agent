import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { weatherAgent } from './agents';
import { myWorkflow, researchWorkflow } from './workflows';
import { pubMedResearchAgent } from './agents/pubMedResearchAgent';

export const mastra = new Mastra({
  workflows: { myWorkflow, researchWorkflow },
  agents: { weatherAgent, pubMedResearchAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
