import { supabase } from './supabase.js';
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from './utils/findRelevantContent.js';
import { Request } from 'express';

const SYSTEM_PROMPT = `You are a specialized PubMed research assistant designed to provide accurate, evidence-based answers to biomedical and scientific questions. Use the 'getInformation' tool to search for relevant information from PubMed articles.
Base your responses solely on the data retrieved from the tool, ensuring clarity and precision. 
If the tool does not provide sufficient information to answer the question, state that no relevant information was found and avoid speculating. Summarize key findings concisely, citing the context of the articles where appropriate, 
and tailor your response to the user's level of expertise as inferred from their question.`;

export async function handleChatRequest(req: Request): Promise<Response> {
  try {
    const { chatId, messages } = req.body;

    if (!chatId || !messages?.length) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: chatId and messages',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userMessages = messages.filter(
      (message: { role: string }) => message.role === 'user'
    );
    const mostRecentUserMessage = userMessages.at(-1);

    if (!mostRecentUserMessage) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: messageError } = await supabase.from('messages').insert({
      chat_id: chatId,
      parts: mostRecentUserMessage.parts,
      role: 'user',
    });

    if (messageError) {
      throw new Error(`Failed to store user message: ${messageError.message}`);
    }

    const result = streamText({
      model: google('gemini-2.5-pro-exp-03-25'),
      messages,
      system: SYSTEM_PROMPT,
      tools: {
        getInformation: tool({
          description:
            'Get information from your knowledge base to answer questions.',
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => findRelevantContent(question),
        }),
      },
      onFinish: async ({ response }) => {
        const assistantMessages = response.messages.filter(
          (msg) => msg.role === 'assistant'
        );

        if (assistantMessages.length > 0) {
          const assistantMessage =
            assistantMessages[assistantMessages.length - 1];
          const { error: storeError } = await supabase.from('messages').insert({
            chat_id: chatId,
            parts: assistantMessage?.content,
            role: 'assistant',
          });

          if (storeError) {
            console.error('Failed to store assistant message:', storeError);
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat request error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
