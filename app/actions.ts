'use server';

import { mastra } from '@/src/mastra';

export async function getWeatherInfo(city: string) {
  const agent = mastra.getAgent('weatherAgent');

  const result = await agent.generate(`What's the weather like in ${city}?`);
  let text = result.steps[1];

  return text;
}
