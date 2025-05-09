'use client';

import { useAuth } from '@/providers/AuthProvider';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Research() {
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
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
      const result = await fetch(process.env.NEXT_PUBLIC_API_URL + '/queue', {
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
    <div className="flex flex-col h-full">
      <div className="max-w-3xl mx-auto flex flex-col h-full w-full px-4">
        <div className="flex-1 flex-col items-center justify-center">
          <div className="pt-64 py-8">
            <h1 className="text-3xl font-bold text-white text-center pb-6">
              What would you like to research?
            </h1>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleSubmit(formData);
              }}
              className="space-y-4"
            >
              <div className="relative">
                <input
                  name="query"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter research query (e.g., 'What are the effects of magnesium on sleep?')"
                  className="w-full rounded-lg bg-zinc-800/80 backdrop-blur-sm pl-4 pr-12 py-3 text-white placeholder:text-zinc-400 border border-zinc-700/50 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md cursor-pointer p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent disabled:cursor-auto transition-colors border border-zinc-700/50"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    handleSuggestedQuery(
                      'What are the effects of magnesium on sleep?',
                    )
                  }
                  className="cursor-pointer rounded-lg bg-zinc-800/80 backdrop-blur-sm p-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:cursor-auto disabled:bg-zinc-600/30 disabled:text-zinc-500"
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
                  className="cursor-pointer rounded-lg bg-zinc-800/80 backdrop-blur-sm p-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:cursor-auto disabled:bg-zinc-600/30 disabled:text-zinc-500"
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
                  className="cursor-pointer rounded-lg bg-zinc-800/80 backdrop-blur-sm p-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:cursor-auto disabled:bg-zinc-600/30 disabled:text-zinc-500"
                >
                  What is the role of gut microbiome in immunity?
                </button>
              </div>
            </form>

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950 p-4 text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
