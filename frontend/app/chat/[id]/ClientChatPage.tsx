'use client';

import { References } from '@/components/references';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/providers/supabase';
import { useChat } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

export default function ClientChatPage({
  params,
  initialMessages,
}: {
  params: { id: string };
  initialMessages: UIMessage[];
}) {
  const [stepStates, setStepStates] = useState<{
    [key: string]: { status: 'loading' | 'completed' | 'error'; data?: any };
  }>({
    'Extracting key terms': { status: 'loading' },
    'Fetching relevant articles': { status: 'loading' },
    'Processing and embedding papers': { status: 'loading' },
  });
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );
  const [task, setTask] = useState<{
    task_id: string;
    message: string;
    state: string;
    parsed_query?: { keyTerms: string[]; rawTerms: string[] };
    updated_at: string;
    user_id: string;
    created_at: string;
    total_articles?: number;
    processed_articles?: number;
    chats?: Array<{
      chat_resources: Array<{
        resources: {
          pmid: number;
          pmcid: number;
          title: string;
          authors: string[];
          journal: string;
          pub_date: string;
          source_url: string;
          full_text_url: string;
        };
      }>;
    }>;
  } | null>(null);

  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    status,
  } = useChat({
    maxSteps: 3,
    api: process.env.NEXT_PUBLIC_API_URL + '/api/chat',
    body: { chatId: params.id },
    initialMessages, // Pass initialMessages to useChat
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    console.log('Messages updated:', messages);
  }, [messages]);

  const steps = useMemo(
    () => [
      'Extracting key terms',
      'Fetching relevant articles',
      'Processing and embedding papers',
    ],
    [],
  );

  const stateToStep = useMemo(
    () =>
      ({
        parseQuery: 'Extracting key terms',
        fetchMetadata: 'Fetching relevant articles',
        processPaper: 'Processing and embedding papers',
        Complete: 'Processing and embedding papers',
      }) as const,
    [],
  );

  type TaskState = 'parseQuery' | 'fetchMetadata' | 'processPaper' | 'Complete';

  const updateStepStates = useCallback(
    (data: {
      state: TaskState;
      parsed_query?: { keyTerms: string[]; rawTerms: string[] };
      chats?: Array<{
        chat_resources: Array<{
          resources: {
            pmid: number;
            pmcid: number;
            title: string;
            authors: string[];
            journal: string;
            pub_date: string;
            source_url: string;
            full_text_url: string;
          };
        }>;
      }>;
      processed_articles?: number;
      total_articles?: number;
    }) => {
      const { state, parsed_query, chats, processed_articles, total_articles } =
        data;
      const stepName = stateToStep[state];
      if (stepName) {
        setStepStates((prev) => {
          const newStates = { ...prev };
          steps.forEach((step) => {
            if (!newStates[step]) newStates[step] = { status: 'loading' };
          });

          if (
            [
              'parseQuery',
              'fetchMetadata',
              'processPaper',
              'Complete',
            ].includes(state)
          ) {
            newStates['Extracting key terms'] = {
              status: 'completed',
              data: parsed_query,
            };
          }
          if (['fetchMetadata', 'processPaper', 'Complete'].includes(state)) {
            newStates['Fetching relevant articles'] = {
              status: 'completed',
              data: chats?.[0]?.chat_resources || [],
            };
          }
          if (state === 'processPaper') {
            newStates['Processing and embedding papers'] = {
              status: 'loading',
              data: {
                processed_articles: processed_articles || 0,
                total_articles: total_articles || 0,
              },
            };
          }
          if (state === 'Complete') {
            newStates['Processing and embedding papers'] = {
              status: 'completed',
              data: {
                processed_articles: processed_articles || 0,
                total_articles: total_articles || 0,
              },
            };
          }
          return newStates;
        });
      }
    },
    [setStepStates, stateToStep, steps],
  );

  // Fetch initial task state
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', params.id)
          .single();

        if (chatError) throw chatError;
        if (!chatData?.task_id) throw new Error('No task found for this chat');

        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select(
            `
            *,
            chats!inner (
              chat_resources (
                resources (
                  authors, full_text_url, journal, pmcid, pmid, pub_date, source_url, title
                )
              )
            )
          `,
          )
          .eq('task_id', chatData.task_id)
          .single();

        if (taskError) throw taskError;
        console.log('Initial TASKDATA: ', taskData);
        setTask(taskData);
        if (taskData) updateStepStates(taskData);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setStepStates((prev) => ({
          ...prev,
          'Extracting key terms': { status: 'error' },
          'Fetching relevant articles': { status: 'error' },
          'Processing and embedding papers': { status: 'error' },
        }));
        setSubscriptionError('Failed to load initial data');
      }
    }
    fetchInitialData();
  }, [params.id, updateStepStates]);

  // Subscribe to task updates and chat resources
  useEffect(() => {
    if (!task?.task_id) return;

    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `task_id=eq.${task.task_id}`,
        },
        async () => {
          // Fetch the full task data with resources when task is updated
          const { data: updatedTask, error } = await supabase
            .from('tasks')
            .select(
              `
              *,
              chats!inner (
                chat_resources (
                  resources (
                    authors, full_text_url, journal, pmcid, pmid, pub_date, source_url, title
                  )
                )
              )
            `,
            )
            .eq('task_id', task.task_id)
            .single();

          if (error) {
            console.error('Error fetching updated task:', error);
            return;
          }

          if (updatedTask) {
            setTask(updatedTask);
            updateStepStates(updatedTask);
          }
        },
      )
      .subscribe();

    // Subscribe to chat_resources updates
    const chatResourcesChannel = supabase
      .channel('chat-resources-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_resources',
          filter: `chat_id=eq.${params.id}`,
        },
        async () => {
          // Fetch updated task with resources
          const { data: updatedTask, error } = await supabase
            .from('tasks')
            .select(
              `
              *,
              chats!inner (
                chat_resources (
                  resources (
                    authors, full_text_url, journal, pmcid, pmid, pub_date, source_url, title
                  )
                )
              )
            `,
            )
            .eq('task_id', task.task_id)
            .single();

          if (error) {
            console.error('Error fetching updated chat resources:', error);
            return;
          }

          if (updatedTask) {
            setTask(updatedTask);
            updateStepStates(updatedTask);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chatResourcesChannel);
    };
  }, [task?.task_id, params.id, updateStepStates]);

  function convertToUIMessages(messages: Array<any>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
    }));
  }

  function parseReferences(text: string) {
    const references: Array<{
      authors: string;
      title: string;
      journal: string;
      year: string;
      pmid: string;
    }> = [];

    // Match references in the format [1] Author et al., Title, Journal (Year). PMID: XXXXXX
    const refRegex =
      /\[(\d+)\]\s*([^,]+),\s*([^,]+),\s*([^(]+)\s*\((\d{4})\)\.\s*PMID:\s*(\d+)/g;
    let match;

    while ((match = refRegex.exec(text)) !== null) {
      references.push({
        authors: match[2].trim(),
        title: match[3].trim(),
        journal: match[4].trim(),
        year: match[5],
        pmid: match[6],
      });
    }

    return references;
  }

  function splitMessageAndReferences(text: string) {
    const refIndex = text.indexOf('\n\nReferences:');
    if (refIndex === -1) return { message: text, references: [] };

    const message = text.substring(0, refIndex).trim();
    const references = parseReferences(text.substring(refIndex));

    // Deduplicate references based on PMID
    const uniqueReferences = references.reduce((acc: any[], current) => {
      const exists = acc.find((item) => item.pmid === current.pmid);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return { message, references: uniqueReferences };
  }

  return (
    <div className="h-full">
      {/* Main container for both content and input */}
      <div className="max-w-3xl mx-auto flex flex-col h-full w-full">
        {/* Scrollable content area with padding for the fixed input */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          {/* Messages Section */}
          <div className="space-y-4 px-4 flex-1">
            {convertToUIMessages(messages).map((m, index) => (
              <React.Fragment key={m.id}>
                {m.role === 'user' && index === 0 ? (
                  <div className="mb-6 px-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
                      Initial Query
                    </h3>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                      {m.parts.map((part, partIndex) =>
                        part.type === 'text' ? (
                          <p key={partIndex} className="text-gray-200">
                            {part.text}
                          </p>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`${
                        m.role === 'user'
                          ? 'bg-zinc-800 border border-zinc-400/10 text-white p-3 rounded-2xl max-w-[90%] shadow-sm'
                          : 'text-white p-3 rounded-2xl max-w-[100%] shadow-sm'
                      } whitespace-pre-wrap`}
                    >
                      {m.role === 'user'
                        ? // Render user messages as plain text
                          m.parts.map((part, index) => (
                            // @ts-expect-error - part.text is guaranteed to exist for user messages
                            <p key={index}>{part.text}</p>
                          ))
                        : // Render assistant messages with Markdown
                          m.parts.map((part, index) => {
                            if (part.type !== 'text') return null;
                            const { message, references } =
                              splitMessageAndReferences(part.text);
                            return (
                              <div key={index}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                >
                                  {message}
                                </ReactMarkdown>
                                {references.length > 0 && (
                                  <References references={references} />
                                )}
                              </div>
                            );
                          })}
                    </div>
                  </div>
                )}
                {/* Show task progress after first user message */}
                {m.role === 'user' && index === 0 && (
                  <div className="mb-6 px-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wide">
                      Research Progress
                    </h3>
                    <div className="relative pl-6">
                      <div className="absolute top-0 bottom-0 left-[5px] w-0.25 bg-gray-700" />
                      {steps.map((step) => (
                        <div key={step} className="relative mb-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {stepStates[step]?.status === 'loading' && (
                                <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                              )}
                              {stepStates[step]?.status === 'completed' && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              )}
                              {stepStates[step]?.status === 'error' && (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center">
                              <div className="absolute left-[-22.5px] w-2 h-2 rounded-full bg-gray-800 border border-gray-700 z-10" />
                              {step === 'Processing and embedding papers' ? (
                                <div className="flex flex-col">
                                  <span className="text-sm text-gray-200">
                                    {step}
                                  </span>
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${task?.state === 'processPaper' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>Processing articles...</span>
                                        <span className="text-gray-300">
                                          {stepStates[step]?.data
                                            ?.processed_articles || 0}{' '}
                                          /{' '}
                                          {stepStates[step]?.data
                                            ?.total_articles || 0}
                                        </span>
                                      </div>
                                      <Progress
                                        value={
                                          ((stepStates[step]?.data
                                            ?.processed_articles || 0) /
                                            (stepStates[step]?.data
                                              ?.total_articles || 1)) *
                                          100
                                        }
                                        className="h-2 w-full bg-zinc-800"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setActiveStep(
                                      activeStep === step ? null : step,
                                    )
                                  }
                                  className="text-sm text-gray-200 hover:text-gray-400 transition-colors flex items-center cursor-pointer"
                                >
                                  {step}
                                  <div className="relative w-4 h-4 ml-2">
                                    <ChevronRight
                                      className={`absolute w-4 h-4 transition-all duration-200 ${
                                        activeStep === step
                                          ? 'rotate-90 opacity-0'
                                          : 'rotate-0 opacity-100'
                                      }`}
                                    />
                                    <ChevronDown
                                      className={`absolute w-4 h-4 transition-all duration-200 ${
                                        activeStep === step
                                          ? 'rotate-0 opacity-100'
                                          : '-rotate-90 opacity-0'
                                      }`}
                                    />
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                          {activeStep === step && stepStates[step]?.data && (
                            <div className="p-2 rounded-md text-xs text-gray-400 ">
                              {step === 'Extracting key terms' &&
                                stepStates[step]?.data?.keyTerms && (
                                  <div className="">
                                    <div className="flex flex-wrap gap-2">
                                      {stepStates[step].data.keyTerms.map(
                                        (term: string, index: number) => (
                                          <span
                                            key={index}
                                            className="px-2 py-1 bg-zinc-800 rounded-md"
                                          >
                                            {term}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              {step === 'Fetching relevant articles' &&
                                stepStates[step]?.data && (
                                  <div className="space-y-4">
                                    {stepStates[step].data.map(
                                      (resource: any, index: number) => (
                                        <div
                                          key={index}
                                          className="border-b border-zinc-800 last:border-b-0 pb-4 last:pb-0"
                                        >
                                          <div className="font-medium text-gray-300 mb-1">
                                            {resource.resources.title}
                                          </div>
                                          <div className="text-gray-400 text-xs mb-1">
                                            {resource.resources.authors.join(
                                              ', ',
                                            )}
                                          </div>
                                          <div className="text-gray-400 text-xs mb-1">
                                            {resource.resources.journal} •{' '}
                                            {resource.resources.pub_date}
                                          </div>
                                          <a
                                            href={
                                              resource.resources.full_text_url
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 text-xs"
                                          >
                                            View Full Text
                                          </a>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              {step === 'Processing and embedding papers' && (
                                <div className="text-gray-400 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span>Processing articles...</span>
                                    <span className="text-gray-300">
                                      {stepStates[step]?.data
                                        ?.processed_articles || 0}{' '}
                                      /{' '}
                                      {stepStates[step]?.data?.total_articles ||
                                        0}
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      ((stepStates[step]?.data
                                        ?.processed_articles || 0) /
                                        (stepStates[step]?.data
                                          ?.total_articles || 1)) *
                                      100
                                    }
                                    className="h-2 bg-zinc-800"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {activeStep === step &&
                            stepStates[step]?.status === 'error' && (
                              <div className="mt-2 p-3 bg-red-950 rounded-md text-xs text-red-400 border border-red-900">
                                Error:{' '}
                                {subscriptionError || 'Step failed to complete'}
                              </div>
                            )}
                        </div>
                      ))}
                      {Object.values(stepStates).every(
                        (state) => state.status === 'completed',
                      ) && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-900/40 to-black-900/20 border border-green-900/50 rounded-lg">
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">
                              Research Complete
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-300">
                            Your research materials are ready! You can now ask
                            questions about the papers, request summaries, or
                            explore specific topics in detail.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input form */}
        <div className="w-full">
          <form onSubmit={handleSubmit} className="px-4">
            <div className="pb-6 p-3 pt-3 bg-zinc-900/80 backdrop-blur-sm rounded-t-xl border-t border-zinc-700">
              <div className="flex flex-row justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status === 'submitted'
                        ? 'bg-yellow-500'
                        : status === 'streaming'
                          ? 'bg-blue-500 animate-pulse'
                          : status === 'ready'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-red-500'
                    }`}
                  />
                  <span className="capitalize">{status} - Gemini 1.5 Pro</span>
                </div>
                <button
                  type="submit"
                  disabled={
                    status === 'submitted' ||
                    status === 'streaming' ||
                    !input.trim()
                  }
                  className="inline-flex cursor-pointer items-center justify-center w-9 h-9 p-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed shadow border border-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6-6 6 6" />
                    <path d="M12 3v18" />
                  </svg>
                  <span className="sr-only">Send message</span>
                </button>
              </div>
              <div className="flex items-start gap-2">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="w-full custom-scrollbar-sidebar pl-4 pr-4 text-white placeholder:text-zinc-400 focus:outline-none resize-none min-h-[40px] max-h-[240px]"
                  disabled={status === 'submitted' || status === 'streaming'}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (
                        input.trim() &&
                        status !== 'submitted' &&
                        status !== 'streaming'
                      ) {
                        handleSubmit(e);
                      }
                    }
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height =
                      Math.min(e.currentTarget.scrollHeight, 240) + 'px';
                  }}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
