import { supabase } from '../../libs/supabase.js';
import { google } from '@ai-sdk/google';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from './utils/findRelevantContent.js';
import { Request } from 'express';
import { SYSTEM_PROMPT } from './utils/systemPrompt.js';

export async function handleChatRequest(req: Request): Promise<Response> {
  try {
    const { chatId, messages } = req.body;
    // console.log('Received chat request:', JSON.stringify(req.body, null, 2));
    console.log('Most recent message:', messages[messages.length - 1]);

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

    // Only store user message if it's the most recent message
    const mostRecentMessage = messages[messages.length - 1];
    if (mostRecentMessage.role === 'user') {
      console.log('Storing user message in database...');
      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: chatId,
        parts: mostRecentUserMessage.parts,
        role: 'user',
      });

      if (messageError) {
        console.error('Failed to store user message:', messageError);
        throw new Error(
          `Failed to store user message: ${messageError.message}`
        );
      }
    } else {
      console.log(
        'Skipping user message storage as most recent message is not from user'
      );
    }

    const validatedMessages = messages.filter((message: any) => {
      if (message.role !== 'user' && message.role !== 'assistant') return false;
      if (!Array.isArray(message.parts)) return false;

      // Only keep messages with at least one valid text part
      return message.parts.some(
        (part: any) =>
          part?.type === 'text' &&
          typeof part.text === 'string' &&
          part.text.trim().length > 0
      );
    });

    console.log(SYSTEM_PROMPT);

    const result = streamText({
      model: google('gemini-2.0-flash'),
      messages: validatedMessages,
      system: SYSTEM_PROMPT,
      maxSteps: 5,
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
            console.log('Finding relevant content for chat ID:', chatId);
            const content = await findRelevantContent(question, chatId);
            return content;
          },
        }),
      },
      onFinish: async ({ response }) => {
        console.log('AI stream finished, processing response...');
        console.log(JSON.stringify(response.messages, null, 2));
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
            console.error(
              'Error details:',
              JSON.stringify(storeError, null, 2)
            );
          } else {
            console.log('Successfully stored assistant message');
            console.log('Stored message details:', {
              chat_id: chatId,
              role: 'assistant',
              content_length: assistantMessage?.content?.length,
            });
          }
        } else {
          console.log('No assistant messages found in response');
        }
      },
    });

    console.log('Stream text setup complete, returning stream response');
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
