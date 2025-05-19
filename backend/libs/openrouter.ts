import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import 'dotenv/config';

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
