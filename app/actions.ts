'use server';

import { mastra } from '@/src/mastra'; // Assuming mastra is imported from somewhere

export async function getResearchInfo(query: string) {
  try {
    const { runId, start } = mastra.getWorkflow('researchWorkflow').createRun();

    const runResult = await start({
      triggerData: { query: query },
    });

    return runResult; // Return the output from the workflow result
  } catch (error) {
    console.error('Error in getResearchInfo:', error);
    throw error; // Re-throw to let the caller handle it
  }
}
