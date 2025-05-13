'use client';

import { ReferencesWithHoverCards } from '@/components/references';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { supabase } from '@/providers/supabase';
import { useChat } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Users,
  XCircle,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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
        number: number;
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
  const [selectedModel, setSelectedModel] = useState('gpt-o3-mini');

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    maxSteps: 3,
    api: process.env.NEXT_PUBLIC_API_URL + '/api/chat',
    body: {
      chatId: params.id,
      model:
        selectedModel === 'gpt-o3-mini'
          ? 'openai/o3-mini'
          : 'google/gemini-2.5-flash-preview',
    },
    initialMessages,
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
          number: number;
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

          if (['fetchMetadata', 'processPaper', 'Complete'].includes(state)) {
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
                number,
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
                  number,
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
                  number,
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

  function splitMessageAndReferences(text: string) {
    if (!task?.chats?.[0]?.chat_resources) {
      return { message: text, references: [] };
    }

    // Convert chat_resources to the format expected by wrapReferencesWithHoverCards
    const references = task.chats[0].chat_resources.map((resource) => ({
      authors: resource.resources.authors.join(', '),
      title: resource.resources.title,
      journal: resource.resources.journal,
      year: resource.resources.pub_date,
      pmid: resource.resources.pmid.toString(),
    }));

    return { message: text, references };
  }

  const models = [
    {
      id: 'gpt-o3-mini',
      name: 'GPT o3 Mini',
      logo: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="118 120 480 480"
          fill="currentColor"
          className="w-4 h-4 text-zinc-400"
        >
          <path d="M304.246 295.411V249.828C304.246 245.989 305.687 243.109 309.044 241.191L400.692 188.412C413.167 181.215 428.042 177.858 443.394 177.858C500.971 177.858 537.44 222.482 537.44 269.982C537.44 273.34 537.44 277.179 536.959 281.018L441.954 225.358C436.197 222 430.437 222 424.68 225.358L304.246 295.411ZM518.245 472.945V364.024C518.245 357.304 515.364 352.507 509.608 349.149L389.174 279.096L428.519 256.543C431.877 254.626 434.757 254.626 438.115 256.543L529.762 309.323C556.154 324.679 573.905 357.304 573.905 388.971C573.905 425.436 552.315 459.024 518.245 472.941V472.945ZM275.937 376.982L236.592 353.952C233.235 352.034 231.794 349.154 231.794 345.315V239.756C231.794 188.416 271.139 149.548 324.4 149.548C344.555 149.548 363.264 156.268 379.102 168.262L284.578 222.964C278.822 226.321 275.942 231.119 275.942 237.838V376.986L275.937 376.982ZM360.626 425.922L304.246 394.255V327.083L360.626 295.416L417.002 327.083V394.255L360.626 425.922ZM396.852 571.789C376.698 571.789 357.989 565.07 342.151 553.075L436.674 498.374C442.431 495.017 445.311 490.219 445.311 483.499V344.352L485.138 367.382C488.495 369.299 489.936 372.179 489.936 376.018V481.577C489.936 532.917 450.109 571.785 396.852 571.785V571.789ZM283.134 464.79L191.486 412.01C165.094 396.654 147.343 364.029 147.343 332.362C147.343 295.416 169.415 262.309 203.48 248.393V357.791C203.48 364.51 206.361 369.308 212.117 372.665L332.074 442.237L292.729 464.79C289.372 466.707 286.491 466.707 283.134 464.79ZM277.859 543.48C223.639 543.48 183.813 502.695 183.813 452.314C183.813 448.475 184.294 444.636 184.771 440.797L279.295 495.498C285.051 498.856 290.812 498.856 296.568 495.498L417.002 425.927V471.509C417.002 475.349 415.562 478.229 412.204 480.146L320.557 532.926C308.081 540.122 293.206 543.48 277.854 543.48H277.859ZM396.852 600.576C454.911 600.576 503.37 559.313 514.41 504.612C568.149 490.696 602.696 440.315 602.696 388.976C602.696 355.387 588.303 322.762 562.392 299.25C564.791 289.173 566.231 279.096 566.231 269.024C566.231 200.411 510.571 149.067 446.274 149.067C433.322 149.067 420.846 150.984 408.37 155.305C386.775 134.192 357.026 120.758 324.4 120.758C266.342 120.758 217.883 162.02 206.843 216.721C153.104 230.637 118.557 281.018 118.557 332.357C118.557 365.946 132.95 398.571 158.861 422.083C156.462 432.16 155.022 442.237 155.022 452.309C155.022 520.922 210.682 572.266 274.978 572.266C287.931 572.266 300.407 570.349 312.883 566.028C334.473 587.141 364.222 600.576 396.852 600.576Z"></path>
        </svg>
      ),
    },
    {
      id: 'gemini-2.5-flash-preview',
      name: 'Gemini 2.5 Flash',
      logo: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-4 h-4 text-zinc-400"
        >
          <title>Gemini</title>
          <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"></path>
        </svg>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Main container for both content and input */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Scrollable content area with padding for the fixed input */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          {/* Messages Section */}
          <div className="max-w-3xl mx-auto space-y-4 px-4">
            {convertToUIMessages(messages).map((m, index) => (
              <React.Fragment key={m.id}>
                {m.role === 'user' && index === 0 ? (
                  <div className="mb-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-gray-200">
                            Initial Query
                          </p>
                          {task?.created_at && (
                            <p className="text-sm text-gray-400">
                              {new Date(task.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          {m.parts.map((part, partIndex) =>
                            part.type === 'text' ? (
                              <p key={partIndex} className="text-gray-200">
                                {part.text}
                              </p>
                            ) : null,
                          )}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800 pt-4">
                        <p className="font-bold mb-2 text-gray-200">
                          Research Progress
                        </p>
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
                                  {step ===
                                  'Processing and embedding papers' ? (
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
                              {activeStep === step &&
                                stepStates[step]?.data && (
                                  <div className="p-2 rounded-md text-xs text-gray-400 bg-zinc-800/50 mt-2">
                                    {step === 'Extracting key terms' &&
                                      stepStates[step]?.data?.keyTerms && (
                                        <div className="">
                                          <div className="flex flex-wrap gap-2">
                                            {stepStates[step].data.keyTerms.map(
                                              (term: string, index: number) => (
                                                <span
                                                  key={index}
                                                  className="px-2 py-1 bg-zinc-900 rounded-md"
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
                                        <div className="space-y-4 p-1">
                                          {[...stepStates[step].data]
                                            .sort((a, b) => a.number - b.number)
                                            .map(
                                              (
                                                resource: any,
                                                index: number,
                                              ) => (
                                                <div
                                                  key={index}
                                                  className="border-b border-zinc-800 last:border-b-0 pb-2 last:pb-0 px-2"
                                                >
                                                  <div className="flex items-start gap-2 mb-2">
                                                    <div className="mt-1">
                                                      <FileText className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                      <div className="font-medium text-gray-200 text-sm">
                                                        [{resource.number}]{' '}
                                                        {
                                                          resource.resources
                                                            .title
                                                        }
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1 pl-6">
                                                    <Users className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                                    <span className="truncate">
                                                      {resource.resources.authors.join(
                                                        ', ',
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 pl-6">
                                                    <BookOpen className="w-3 h-3 text-zinc-500" />
                                                    {resource.resources.journal}{' '}
                                                    •{' '}
                                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                                    {
                                                      resource.resources
                                                        .pub_date
                                                    }
                                                  </div>
                                                  <div className="pl-6">
                                                    <a
                                                      href={
                                                        resource.resources
                                                          .full_text_url
                                                      }
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                                    >
                                                      <ExternalLink className="w-3 h-3" />
                                                      View Full Text
                                                    </a>
                                                  </div>
                                                </div>
                                              ),
                                            )}
                                        </div>
                                      )}
                                    {step ===
                                      'Processing and embedding papers' && (
                                      <div className="text-gray-400 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
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
                                    {subscriptionError ||
                                      'Step failed to complete'}
                                  </div>
                                )}
                            </div>
                          ))}
                          {typeof task?.processed_articles === 'number' &&
                          typeof task?.total_articles === 'number' &&
                          task.processed_articles === task.total_articles &&
                          task.total_articles > 0 ? (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-900/40 to-black-900/20 border border-green-900/50 rounded-lg">
                              <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">
                                  Research Complete
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-gray-300">
                                Your research materials are ready! You can now
                                ask questions about the papers, request
                                summaries, or explore specific topics in detail.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                              <p>
                                If the research progress is still loading after
                                30 seconds, try refreshing the page.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
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
                        : // Render assistant messages with Markdown and references
                          m.parts.map((part, index) => {
                            if (part.type !== 'text') return null;
                            const { message, references } =
                              splitMessageAndReferences(part.text);
                            return (
                              <div key={index}>
                                <ReferencesWithHoverCards
                                  text={message}
                                  references={references}
                                />
                              </div>
                            );
                          })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input form */}
        <div className="w-full bg-background">
          <form onSubmit={handleSubmit} className="px-4">
            <div className="max-w-3xl mx-auto pb-6 p-3 pt-3 bg-zinc-900/80 backdrop-blur-sm rounded-t-xl border-t border-zinc-700">
              <div className="flex flex-row justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4 pl-4"></div>
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
              <div className="flex items-center justify-between mt-2 px-4">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[200px] h-8 bg-transparent border-none text-zinc-400 hover:text-zinc-300 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {models.find((m) => m.id === selectedModel)?.logo}
                      <span>
                        {models.find((m) => m.id === selectedModel)?.name}
                      </span>
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
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.logo}
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
