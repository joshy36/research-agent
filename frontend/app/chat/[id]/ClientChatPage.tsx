'use client';

import { ModelSelector } from '@/components/ModelSelector';
import { ReferencesWithHoverCards } from '@/components/references';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import { useChat } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Users,
  XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function ClientChatPage({
  params,
  initialMessages,
  initialChatData,
}: {
  params: { id: string };
  initialMessages: UIMessage[];
  initialChatData: {
    title: string;
    createdAt: string;
    taskId: string;
  };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'chat');
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
  const [chatTitle] = useState<string>(initialChatData.title);
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState({
    count: 0,
    limit: 5,
    resetDate: null as null | string,
  });
  const [loadingLimit, setLoadingLimit] = useState(true);

  const { user } = useAuth();

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
    onError: (error) => {
      if (
        error instanceof Error &&
        error.message.includes('Message limit reached')
      ) {
        toast.error(
          'You have reached your weekly message limit (5 per week). Please try again later.',
        );
      }
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (animate = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: animate ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
    console.log('Messages updated:', messages);
  }, [messages]);

  const steps = useMemo(
    () => [
      'Extracting key terms',
      'Fetching relevant articles',
      'Processing and embedding papers',
      'Generating response',
    ],
    [],
  );

  const stateToStep = useMemo(
    () =>
      ({
        parseQuery: 'Extracting key terms',
        fetchMetadata: 'Fetching relevant articles',
        processPaper: 'Processing and embedding papers',
        generatingResponse: 'Generating response',
        Complete: 'Complete',
      }) as const,
    [],
  );

  type TaskState =
    | 'parseQuery'
    | 'fetchMetadata'
    | 'processPaper'
    | 'generatingResponse'
    | 'Complete';

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

          if (
            [
              'fetchMetadata',
              'processPaper',
              'generatingResponse',
              'Complete',
            ].includes(state)
          ) {
            newStates['Extracting key terms'] = {
              status: 'completed',
              data: parsed_query,
            };
          }
          if (state === 'fetchMetadata') {
            newStates['Fetching relevant articles'] = {
              status: 'loading',
              data: chats?.[0]?.chat_resources || [],
            };
          } else if (
            ['processPaper', 'generatingResponse', 'Complete'].includes(state)
          ) {
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
          if (['generatingResponse', 'Complete'].includes(state)) {
            newStates['Processing and embedding papers'] = {
              status: 'completed',
              data: {
                processed_articles: processed_articles || 0,
                total_articles: total_articles || 0,
              },
            };
          }
          if (state === 'generatingResponse') {
            newStates['Generating response'] = {
              status: 'loading',
            };
          }
          if (state === 'Complete') {
            newStates['Generating response'] = {
              status: 'completed',
            };
          }
          return newStates;
        });
      }
    },
    [setStepStates, stateToStep, steps],
  );

  // Fetch initial task state and chat title
  useEffect(() => {
    async function fetchInitialData() {
      try {
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
          .eq('task_id', initialChatData.taskId)
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
  }, [initialChatData.taskId, updateStepStates]);

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

  async function fetchMessageLimit() {
    setLoadingLimit(true);
    try {
      if (!user) {
        console.log(
          '[ClientChatPage] User not available for message limit fetch.',
        );
        setLoadingLimit(false);
        return;
      }
      const url =
        process.env.NEXT_PUBLIC_API_URL +
        `/api/message-limit-status?userId=${user.id}`;
      console.log('[ClientChatPage] Fetching message limit from:', url);
      const res = await fetch(url);
      console.log('[ClientChatPage] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[ClientChatPage] Message limit data:', data);
        setMessageLimit({
          count: data.count,
          limit: data.limit,
          resetDate: data.resetDate
            ? new Date(data.resetDate).toLocaleString()
            : null,
        });
      } else {
        const err = await res.text();
        console.error('[ClientChatPage] Error response:', err);
      }
    } catch (e) {
      console.error('[ClientChatPage] Fetch error:', e);
    } finally {
      setLoadingLimit(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchMessageLimit();
    }
    // eslint-disable-next-line
  }, [params.id, user]);

  // After sending a message, refetch the limit
  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') return;
    if (user) {
      fetchMessageLimit();
    }
    // eslint-disable-next-line
  }, [messages.length, user]);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`);
    if (value === 'chat') {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
  };

  const handleCopyMessage = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    toast.success('Message copied to clipboard');
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  // Wrap handleSubmit to increment messageLimit.count client-side
  const handleSubmitWithLimit = (e: any) => {
    if (
      input.trim() &&
      status !== 'submitted' &&
      status !== 'streaming' &&
      messageLimit.count < messageLimit.limit
    ) {
      setMessageLimit((prev) => ({ ...prev, count: prev.count + 1 }));
    }
    handleSubmit(e);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex-none">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <div className="mb-4">
              <h1 className="text-xl font-semibold text-zinc-200">
                {chatTitle}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                {new Date(initialChatData.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          className="h-full flex flex-col"
          onValueChange={handleTabChange}
        >
          <div className="w-full">
            <div className="max-w-3xl mx-auto px-4 border-b border-zinc-800">
              <TabsList className="w-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <TabsTrigger
                          value="chat"
                          disabled={task?.state !== 'Complete'}
                          className={
                            task?.state !== 'Complete'
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }
                        >
                          Chat
                        </TabsTrigger>
                      </div>
                    </TooltipTrigger>
                    {task?.state !== 'Complete' && (
                      <TooltipContent
                        side="bottom"
                        sideOffset={4}
                        className="bg-black text-white border-zinc-800"
                      >
                        <p>Please wait for research to complete</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <TabsTrigger
                  value="research"
                  className="flex items-center gap-2"
                >
                  Research
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-4 px-4 pb-4">
              <TabsContent value="research" className="mt-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-gray-200">Initial Query</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      {task?.message ? (
                        <p className="text-gray-200">{task.message}</p>
                      ) : (
                        <p className="text-gray-400">
                          Loading initial query...
                        </p>
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
                                        <span>Processing...</span>
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
                              ) : step === 'Generating response' ? (
                                <span className="text-sm text-gray-200">
                                  {step}
                                </span>
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
                                      .map((resource: any, index: number) => (
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
                                                {resource.resources.title}
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
                                            {resource.resources.journal} •{' '}
                                            <Calendar className="w-3 h-3 text-zinc-500" />
                                            {resource.resources.pub_date}
                                          </div>
                                          <div className="pl-6">
                                            <a
                                              href={
                                                resource.resources.full_text_url
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
                                      ))}
                                  </div>
                                )}
                              {step === 'Processing and embedding papers' && (
                                <div className="text-gray-400 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span>Processing...</span>
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
                      {typeof task?.processed_articles === 'number' &&
                      typeof task?.total_articles === 'number' &&
                      task.processed_articles === task.total_articles &&
                      task.total_articles > 0 &&
                      task.state === 'Complete' ? (
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
                          <button
                            onClick={() => handleTabChange('chat')}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Go to Chat</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                          <p>
                            If the research progress is still loading after 30
                            seconds, try refreshing the page.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <div className="space-y-4">
                  {convertToUIMessages(messages).map((m) => (
                    <div
                      key={m.id}
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
                          ? m.parts.map((part, index) =>
                              part.type === 'text' ? (
                                <p key={index}>{part.text}</p>
                              ) : null,
                            )
                          : m.parts.map((part, index) => {
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
                        {m.role === 'assistant' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() =>
                                    handleCopyMessage(
                                      m.parts
                                        .map((part) =>
                                          part.type === 'text' ? part.text : '',
                                        )
                                        .join(''),
                                      m.id,
                                    )
                                  }
                                  className="mt-2 p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-md transition-colors cursor-pointer"
                                >
                                  {copiedMessageId === m.id ? (
                                    <Check className="w-4 h-4 text-zinc-400" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                sideOffset={4}
                                className="bg-black text-white border-zinc-800"
                              >
                                <p>
                                  {copiedMessageId === m.id
                                    ? 'Copied!'
                                    : 'Copy'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Input form */}
      {activeTab === 'chat' && (
        <div className="w-full bg-background">
          <form
            onSubmit={handleSubmitWithLimit}
            className="px-4"
            onClick={() => {
              if (activeTab !== 'chat') {
                handleTabChange('chat');
              }
            }}
          >
            <div className="max-w-3xl mx-auto py-4 p-4 bg-zinc-900/80 backdrop-blur-sm rounded-t-xl border-t border-zinc-700">
              <div className="flex items-start gap-2 relative mb-4">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="w-full custom-scrollbar-sidebar pl-4 pr-4 text-white placeholder:text-zinc-400 focus:outline-none resize-none min-h-[40px] max-h-[240px]"
                  disabled={(() => {
                    const disabled =
                      status === 'submitted' ||
                      status === 'streaming' ||
                      messageLimit.count >= messageLimit.limit;
                    if (disabled)
                      console.log(
                        '[ClientChatPage] Input disabled due to message limit:',
                        messageLimit,
                      );
                    return disabled;
                  })()}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (
                        input.trim() &&
                        status !== 'submitted' &&
                        status !== 'streaming' &&
                        messageLimit.count < messageLimit.limit
                      ) {
                        handleSubmitWithLimit(e);
                      }
                    }
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height =
                      Math.min(e.currentTarget.scrollHeight, 240) + 'px';
                  }}
                />
                {/* Overlay when message limit is reached */}
                {messageLimit.count >= messageLimit.limit && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-lg z-10">
                    <span className="text-xs text-zinc-200 font-semibold text-center px-2">
                      Message limit reached.
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  status={status}
                />
                <div className="flex flex-row items-center gap-4 ml-4 flex-1 justify-end">
                  <div className="hidden md:flex flex-col items-end">
                    <div className="flex flex-row items-center gap-2">
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[120px] w-[120px]">
                        <div
                          className="bg-white h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(messageLimit.count / messageLimit.limit) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-200 font-medium flex flex-row items-center gap-1">
                        {loadingLimit ? (
                          '...'
                        ) : (
                          <>
                            <span>{messageLimit.count}</span>
                            <span className="text-zinc-400">/</span>
                            <span>{messageLimit.limit}</span>
                          </>
                        )}
                      </span>
                    </div>
                    {messageLimit.resetDate && (
                      <span className="text-xs text-zinc-400 mt-1">
                        Resets:{' '}
                        {(() => {
                          // Show date and time (no seconds)
                          const d = new Date(messageLimit.resetDate);
                          return d.toLocaleString(undefined, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          });
                        })()}
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      status === 'submitted' ||
                      status === 'streaming' ||
                      !input.trim() ||
                      messageLimit.count >= messageLimit.limit
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
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
