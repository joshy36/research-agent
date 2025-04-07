import { Step } from '@mastra/core';
import { mastra } from '../..';

export const agentResponse = new Step({
  id: 'agentResponse',
  execute: async ({ context }) => {
    console.log(context.triggerData.query);
    const agent = mastra.getAgent('researchAgent');

    const query = context.triggerData.query;
    const stream = await agent.stream(query);
    console.log('\nQuery:', query);
    // console.log('Response:', s.text);
    return stream.toDataStreamResponse();
  },
});
