import { supabase } from '../../libs/supabase.js';
import { google } from '@ai-sdk/google';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from './utils/findRelevantContent.js';
import { Request } from 'express';

const SYSTEM_PROMPT = `You are PubMed Assistant, an evidence-based biomedical research aide. Your **only** knowledge source is the getInformation tool, which returns excerpts from PubMed articles relevant to the user’s question.

When you respond  
• **Search first.**  
• Call getInformation with the user’s question, then base every claim **solely** on the passages it returns.  

Answer clearly and concisely, matching the user’s expertise.

**Cite precisely**  
• After every factual statement add a citation tag like [1] or [2–3].

**References section — must follow this exact template so the frontend can parse it**

(blank line)  
References:  
[1] First author et al., Article Title, Journal (Year). PMID: 123456  
[2] …  

Formatting rules  
• Precede “References:” with **two** newline characters.  
• One reference per line, starting with a bracketed number.  
• End each line with “PMID:” followed by the PubMed ID.  
• If there are multiple authors, list only the first + “et al.”  
• Do **not** insert extra text or blank lines between references.

If the retrieved passages are insufficient, reply **exactly**:  
“No relevant PubMed information was found to answer this question.”

Never speculate or draw on outside knowledge. Keep summaries faithful to the cited sources and be brief unless the user asks for more detail.

Your goal is to deliver trustworthy, well-sourced biomedical answers—nothing more, nothing less.`;

export async function handleChatRequest(req: Request): Promise<Response> {
  try {
    const { chatId, messages } = req.body;
    console.log('Received chat request:', JSON.stringify(req.body, null, 2));

    if (!chatId || !messages?.length) {
      console.log('Missing required fields:', {
        chatId,
        messagesLength: messages?.length,
      });
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
    console.log('Most recent user message:', mostRecentUserMessage);

    if (!mostRecentUserMessage) {
      console.log('No user message found in messages array');
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Storing user message in database...');
    const { error: messageError } = await supabase.from('messages').insert({
      chat_id: chatId,
      parts: mostRecentUserMessage.parts,
      role: 'user',
    });

    if (messageError) {
      console.error('Failed to store user message:', messageError);
      throw new Error(`Failed to store user message: ${messageError.message}`);
    }

    const result = streamText({
      model: google('gemini-2.0-flash'),
      messages,
      system: SYSTEM_PROMPT,
      tools: {
        getInformation: tool({
          description:
            'Get information from your knowledge base to answer questions.',
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => {
            console.log(
              'Executing getInformation tool with question:',
              question
            );
            return findRelevantContent(question, chatId);
          },
        }),
      },
      onFinish: async ({ response }) => {
        console.log('AI stream finished, processing response...');
        const assistantMessages = response.messages.filter(
          (msg) => msg.role === 'assistant'
        );

        if (assistantMessages.length > 0) {
          const assistantMessage =
            assistantMessages[assistantMessages.length - 1];
          console.log('Storing assistant message in database...');
          const { error: storeError } = await supabase.from('messages').insert({
            chat_id: chatId,
            parts: assistantMessage?.content,
            role: 'assistant',
          });

          if (storeError) {
            console.error('Failed to store assistant message:', storeError);
          } else {
            console.log('Successfully stored assistant message');
          }
        } else {
          console.log('No assistant messages found in response');
        }
      },
    });

    console.log('Returning stream response');
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
