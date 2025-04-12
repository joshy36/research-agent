import { createClient } from '@/supabase/server';
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { findRelevantContent } from './findRelevantContent';

export async function POST(req: NextRequest) {
  try {
    const { chatId, messages } = await req.json();

    const supabase = await createClient();

    const userMessages = messages.filter(
      (message: any) => message.role === 'user',
    );
    const mostRecentUserMessage = userMessages.at(-1);
    console.log('message: ', mostRecentUserMessage);

    const { data } = await supabase.from('messages').insert({
      chat_id: chatId,
      parts: mostRecentUserMessage.parts,
      role: 'user',
    });

    // Stream the response
    const result = streamText({
      model: google('gemini-2.5-pro-exp-03-25'),
      messages,
      system: `You are a specialized PubMed research assistant designed to provide accurate, evidence-based answers to biomedical and scientific questions. Use the 'getInformation' tool to search for relevant information from PubMed articles.
      Base your responses solely on the data retrieved from the tool, ensuring clarity and precision. 
      If the tool does not provide sufficient information to answer the question, state that no relevant information was found and avoid speculating. Summarize key findings concisely, citing the context of the articles where appropriate, 
      and tailor your response to the user's level of expertise as inferred from their question.`,
      tools: {
        getInformation: tool({
          description: `get information from your knowledge base to answer questions.`,
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => findRelevantContent(question),
        }),
      },
      onFinish: async ({ response }) => {
        const assistantMessages = response.messages.filter(
          (msg) => msg.role === 'assistant',
        );
        if (assistantMessages.length > 0) {
          const assistantMessage =
            assistantMessages[assistantMessages.length - 1];
          const { data } = await supabase.from('messages').insert({
            chat_id: chatId,
            parts: assistantMessage.content,
            role: 'assistant',
          });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
