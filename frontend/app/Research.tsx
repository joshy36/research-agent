'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Research() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  async function handleSubmit(formData: FormData) {
    const query = formData.get('query') as string;
    if (!query) {
      setError('Please enter a research query');
      return;
    }
    setError(null);
    try {
      const result = await fetch('http://localhost:3001/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: query, user: user?.id }),
      }).then((res) => res.json());
      console.log('Raw result:', result);

      router.push(`/chat/${result.chatId}`);
    } catch (err) {
      setError('Failed to fetch research data. Please try again.');
      console.error(err);
    }
  }

  async function handleSuggestedQuery(query: string) {
    const formData = new FormData();
    formData.append('query', query);
    await handleSubmit(formData);
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Search Form */}
        <h1 className="text-center font-bold text-4xl">
          What would you like to research?
        </h1>
        <div className="">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleSubmit(formData);
            }}
            className="flex flex-col gap-4"
          >
            <div className="relative w-full">
              <input
                name="query"
                placeholder="Enter research query (e.g., 'What are the effects of magnesium on sleep?')"
                className="w-full rounded-2xl border border-gray-700/50 bg-gray-700/50 p-3 pr-12 text-gray-200 placeholder-gray-500"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-2 -translate-y-1/2 transform cursor-pointer rounded-xl bg-white p-2 text-black transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
            {/* Suggested Query Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  handleSuggestedQuery(
                    'What are the effects of magnesium on sleep?',
                  )
                }
                className="cursor-pointer rounded-lg bg-gray-700/50 p-2 text-gray-200 transition-colors hover:bg-gray-600/50 disabled:cursor-not-allowed disabled:bg-gray-600/30 disabled:text-gray-500"
              >
                What are the effects of magnesium on sleep?
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSuggestedQuery(
                    'How does exercise impact mental health?',
                  )
                }
                className="cursor-pointer rounded-lg bg-gray-700/50 p-2 text-gray-200 transition-colors hover:bg-gray-600/50 disabled:cursor-not-allowed disabled:bg-gray-600/30 disabled:text-gray-500"
              >
                How does exercise impact mental health?
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSuggestedQuery(
                    'What is the role of gut microbiome in immunity?',
                  )
                }
                className="cursor-pointer rounded-lg bg-gray-700/50 p-2 text-gray-200 transition-colors hover:bg-gray-600/50 disabled:cursor-not-allowed disabled:bg-gray-600/30 disabled:text-gray-500"
              >
                What is the role of gut microbiome in immunity?
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-800/50 bg-red-900/80 p-4 text-red-300 shadow-lg backdrop-blur-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
