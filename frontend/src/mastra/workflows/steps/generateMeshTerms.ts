import { Step } from '@mastra/core';
import { pubMedResearchAgent } from '../../agents/pubMedResearchAgent';

interface ResponseType {
  parsedQuery: {
    rawTerms: any;
    keyTerms: any;
  };
  note: any;
}

export const generateMeshTerms = new Step({
  id: 'generateMeshTerms',
  execute: async ({ context }) => {
    const agentResponse = await pubMedResearchAgent.generate([
      { role: 'user', content: context.triggerData.query },
    ]);

    const jsonString = agentResponse.steps[0].text
      .replace(/```json\s*/, '')
      .replace(/\s*```/, '')
      .trim();

    const result = JSON.parse(jsonString) as ResponseType;

    return {
      parsedQuery: result.parsedQuery,
      note: result.note || null,
    };
  },
});
