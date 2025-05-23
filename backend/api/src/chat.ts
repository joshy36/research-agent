import { supabase } from '../../libs/supabase.js';
import { openrouter } from '../../libs/openrouter.js';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from './utils/findRelevantContent.js';
import { Request } from 'express';
import { SYSTEM_PROMPT } from './utils/systemPrompt.js';
import { completeTask } from '../../libs/queue.js';

export async function handleChatRequest(req: Request): Promise<Response> {
  try {
    const { chatId, messages, model = 'openai/o3-mini' } = req.body;

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

    // Get the task ID and user ID for this chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('task_id, user_id')
      .eq('id', chatId)
      .single();

    if (chatError) throw chatError;

    // Enforce 5 user messages per week limit
    if (
      chatData?.user_id &&
      chatData.user_id !== '637ce53d-9787-4dea-9062-0f4f9c0c452c'
    ) {
      const oneWeekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count: userMessageCount, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .in(
          'chat_id',
          (
            await supabase
              .from('chats')
              .select('id')
              .eq('user_id', chatData.user_id)
          ).data?.map((c) => c.id) || []
        )
        .gte('created_at', oneWeekAgo);
      if (countError) throw countError;
      if ((userMessageCount ?? 0) >= 5) {
        return new Response(
          JSON.stringify({
            error:
              'Message limit reached. You can only send 5 messages per week.',
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Remove the early Complete state update
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId);

    if (messagesError) throw messagesError;

    // Map frontend model IDs to OpenRouter model IDs
    const modelMap: { [key: string]: string } = {
      'gpt-o3-mini': 'openai/o3-mini',
      'gemini-2.5-flash-preview': 'google/gemini-2.5-flash-preview',
    };

    const openRouterModel = modelMap[model] || model;

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

    const result = streamText({
      model: openrouter.chat(openRouterModel),
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
            try {
              console.log(
                'Executing getInformation tool with question:',
                question
              );
              console.log('Finding relevant content for chat ID:', chatId);
              const content = await findRelevantContent(question, chatId);
              if (!content || content.length === 0) {
                return { error: 'No relevant content found' };
              }
              return { content };
            } catch (error) {
              console.error('Error in getInformation tool:', error);
              return { error: 'Failed to fetch relevant content' };
            }
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
            model: openRouterModel,
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

            // Only complete task if this is the first message
            if (existingMessages.length === 0 && chatData.task_id) {
              console.log('First message stored, completing task:', {
                task_id: chatData.task_id,
                message_count: existingMessages.length,
              });

              try {
                await completeTask(chatData.task_id);
                console.log('Successfully completed task:', chatData.task_id);
              } catch (error) {
                console.error('Error completing task:', error);
              }
            }
          }
        } else {
          console.log('No assistant messages found in response');
        }
      },
    });

    console.log('Stream text setup complete, returning stream response');
    try {
      const response = result.toDataStreamResponse();
      console.log('Successfully created stream response');
      return response;
    } catch (error) {
      console.error('Error creating stream response:', error);
      throw error;
    }
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
