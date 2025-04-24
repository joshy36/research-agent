'use client';

import { supabase } from '@/providers/supabase';
import { useChat } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import { CheckCircle2, ChevronDown, Loader2, XCircle } from 'lucide-react';
import { use, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

export default function ChatPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const [loading, setLoading] = useState(false);
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
    articles?: {
      articles: Array<{
        pmid: string;
        pmcid: string;
        title: string;
        authors: string[];
        journal: string;
        pubDate: string;
        fullTextUrl: string;
      }>;
    };
    updated_at: string;
    user_id: string;
    created_at: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const { messages, setMessages, input, handleInputChange, handleSubmit } =
    useChat({
      maxSteps: 3,
      api: '/api/chat',
      body: { chatId: params.id },
    });
  const messagesEndRef = useRef<HTMLDivElement>(null); // From step 1

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const steps = [
    'Extracting key terms',
    'Fetching relevant articles',
    'Processing and embedding papers',
  ];

  const stateToStep: { [key: string]: string } = {
    parseQuery: 'Extracting key terms',
    fetchMetadata: 'Fetching relevant articles',
    processPaper: 'Processing and embedding papers',
    Complete: 'Processing and embedding papers',
  };

  // Fetch initial task state and messages
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

        setTitle(chatData.title);

        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('task_id', chatData.task_id)
          .single();

        if (taskError) throw taskError;

        setTask(taskData);
        if (taskData) updateStepStates(taskData);

        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', params.id)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        setMessages(messagesData);
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
  }, [params.id, setMessages]);

  const updateStepStates = (data: any) => {
    const { state, parsed_query, articles } = data;
    const stepName = stateToStep[state];
    if (stepName) {
      setStepStates((prev) => {
        const newStates = { ...prev };
        steps.forEach((step) => {
          if (!newStates[step]) newStates[step] = { status: 'loading' };
        });

        if (
          ['parseQuery', 'fetchMetadata', 'processPaper', 'Complete'].includes(
            state,
          )
        ) {
          newStates['Extracting key terms'] = {
            status: 'completed',
            data: parsed_query,
          };
        }
        if (['fetchMetadata', 'processPaper', 'Complete'].includes(state)) {
          newStates['Fetching relevant articles'] = {
            status: 'completed',
            data: articles,
          };
        }
        if (['processPaper', 'Complete'].includes(state)) {
          newStates['Processing and embedding papers'] = {
            status: 'completed',
            data: null,
          };
        }
        return newStates;
      });
    }
  };

  // Subscribe to task updates
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
        (payload: { new: any }) => {
          console.log('Task updated:', payload.new);
          setTask(payload.new);
          updateStepStates(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task?.task_id]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Full-width scrollable container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Centered content container */}
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <h1 className="text-xl font-semibold text-center mb-6">{title}</h1>
          {/* Task Progress Section */}
          <div className="mb-6 px-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Task Progress
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
                      <button
                        onClick={() =>
                          setActiveStep(activeStep === step ? null : step)
                        }
                        className="text-sm text-gray-200 hover:text-gray-400 transition-colors flex items-center cursor-pointer"
                      >
                        {step}
                        <ChevronDown
                          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                            activeStep === step ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {activeStep === step && stepStates[step]?.data && (
                    <div className="mt-2 p-3 bg-zinc-900 rounded-md text-xs text-gray-400 border border-zinc-800">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(stepStates[step].data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {activeStep === step &&
                    stepStates[step]?.status === 'error' && (
                      <div className="mt-2 p-3 bg-red-950 rounded-md text-xs text-red-400 border border-red-900">
                        Error: {subscriptionError || 'Step failed to complete'}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Messages Section */}
          <div className="space-y-4 px-4 flex-1">
            {convertToUIMessages(messages).map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`${
                    m.role === 'user'
                      ? 'bg-gray-300 text-gray-800 p-3 rounded-2xl max-w-[90%] shadow-sm'
                      : 'text-white p-3 rounded-2xl max-w-[100%] shadow-sm'
                  } whitespace-pre-wrap`}
                >
                  {m.role === 'user'
                    ? // Render user messages as plain text
                      m.parts.map((part, index) => (
                        // @ts-ignore
                        <p key={index}>{part.text}</p>
                      ))
                    : // Render assistant messages with Markdown
                      m.parts.map((part, index) => (
                        // @ts-ignore
                        <ReactMarkdown
                          key={index}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          // className="prose prose-invert max-w-none"
                        >
                          {part.text}
                        </ReactMarkdown>
                      ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Form remains full-width but content is centered */}
      <form
        onSubmit={handleSubmit}
        className="p-4 pt-6 sticky bottom-0 bg-transparent z-10"
      >
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="w-full rounded-lg bg-zinc-800 pl-4 pr-12 py-3 text-white placeholder:text-zinc-400 border border-zinc-700 focus:outline-none focus:border-zinc-600"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md cursor-pointer p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-zinc-700"
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
        </div>
      </form>
    </div>
  );
}
