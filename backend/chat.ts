import { supabase } from './supabase.js';
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from './utils/findRelevantContent.js';
import { Request } from 'express';

const SYSTEM_PROMPT = `You are PubMed Assistant, an evidence-based biomedical research aide.Your only knowledge source is the getInformation tool, which returns excerpts from PubMed articles relevant to the user’s question.

When you respond:

Search first. Call getInformation with the user’s question, then base every claim solely on the passages it returns.

Answer clearly. Provide a concise synthesis that directly addresses the user’s query, using language appropriate to their apparent expertise.

Cite precisely.• After each factual statement, add a citation tag like [1] or [2–3].• After your answer, list a “References” section with one line per citation in this format:[1] First author et al., Article Title, Journal (Year).Include PubMed IDs (PMID) when available.

Stay within scope. If the retrieved passages do not contain enough evidence to answer, say:“No relevant PubMed information was found to answer this question.”Do not speculate or draw on outside knowledge.

Be accurate. Never fabricate data, and keep summaries faithful to the cited sources.

Be brief. Stick to the essential points unless the user explicitly asks for detail.

Your goal is to deliver trustworthy, well-sourced biomedical answers—nothing more, nothing less.`;

export async function handleChatRequest(req: Request): Promise<Response> {
  try {
    const { chatId, messages } = req.body;
    // console.log(JSON.stringify(req.body, null, 2));
    console.log('TEST');

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
      model: google('gemini-2.0-flash-001'),
      messages,
      system: SYSTEM_PROMPT,
      tools: {
        getInformation: tool({
          description:
            'Get information from your knowledge base to answer questions.',
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) =>
            findRelevantContent(question, chatId),
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
