'use client';

import { supabase } from '@/providers/supabase';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { use, useState } from 'react';

export default function ChatPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise); // Unwrap the params Promise
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepStates, setStepStates] = useState<{
    [key: string]: { status: 'loading' | 'completed' | 'error'; data?: any };
  }>({
    'Extracting key terms': { status: 'loading' },
    'Fetching relevant articles from PubMed': { status: 'loading' },
  });
  const [activeStep, setActiveStep] = useState<string | null>(null); // For toggling details
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );

  // Define steps and their order
  const steps = [
    'Extracting key terms',
    'Fetching relevant articles from PubMed',
    // Add future steps here
  ];

  // Map Supabase state to step
  const stateToStep: { [key: string]: string } = {
    step2: 'Extracting key terms',
    step3: 'Fetching relevant articles from PubMed',
    // Add future state mappings here
  };

  function subscribeToTask() {
    console.log('channel');
    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `task_id=eq.${params.id}`, // Use unwrapped params.id
        },
        (payload: { new: any }) => {
          console.log('Task updated:', payload.new);
          const { state, parsed_query, articles } = payload.new;
          const stepName = stateToStep[state];
          if (stepName) {
            setStepStates((prev) => ({
              ...prev,
              [stepName]: {
                status: 'completed',
                data: state === 'step2' ? parsed_query : articles,
              },
            }));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel); // Cleanup on unmount
  }

  subscribeToTask();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const newMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    try {
      // TODO: Implement API call to backend
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   body: JSON.stringify({ message: input, chatId: params.id })
      // });
      // const data = await response.json();
      // setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-900">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Timeline as the first "message" */}
        <div className="mb-4 mr-auto w-full max-w-md rounded-lg bg-gray-700 p-4 text-gray-200">
          <h3 className="mb-4 text-lg font-semibold">Task Progress</h3>
          <div className="relative">
            {steps.map((step, index) => (
              <div key={step} className="flex items-start mb-6">
                {/* Timeline Line */}
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      stepStates[step].status === 'completed'
                        ? 'bg-green-500'
                        : stepStates[step].status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-500'
                    }`}
                  >
                    {stepStates[step].status === 'loading' && (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    )}
                    {stepStates[step].status === 'completed' && (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    )}
                    {stepStates[step].status === 'error' && (
                      <XCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-500 mt-1"></div>
                  )}
                </div>
                {/* Step Content */}
                <div className="flex-1">
                  <button
                    onClick={() =>
                      setActiveStep(activeStep === step ? null : step)
                    }
                    className="text-left text-white hover:text-blue-400"
                  >
                    {step}
                  </button>
                  {activeStep === step && stepStates[step].data && (
                    <div className="mt-2 p-2 bg-zinc-800 rounded-lg text-sm text-gray-300">
                      <pre>
                        {JSON.stringify(stepStates[step].data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {activeStep === step &&
                    stepStates[step].status === 'error' && (
                      <div className="mt-2 p-2 bg-red-900 rounded-lg text-sm text-red-300">
                        Error: {subscriptionError || 'Step failed to complete'}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`mb-4 rounded-lg p-4 ${
              message.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-gray-700 text-gray-200'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-700 p-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
