'use client';

import { useAuth } from '@/providers/AuthProvider';
import {
  BookOpen,
  ChevronRight,
  FileText,
  Info,
  LogIn,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SUGGESTED_QUERIES = [
  'What are the effects of magnesium on sleep?',
  'How does exercise impact mental health?',
  'What is the role of gut microbiome in immunity?',
] as const;

export default function Research() {
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);
  const router = useRouter();
  const { user, showLoginDialog } = useAuth();

  async function handleSubmit(formData: FormData) {
    if (!user) {
      showLoginDialog();
      return;
    }

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
    if (!user) {
      showLoginDialog();
      return;
    }

    const formData = new FormData();
    formData.append('query', query);
    await handleSubmit(formData);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">
                  Research Assistant
                </h1>
                <button
                  onClick={() => setShowExplainer(!showExplainer)}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                  {showExplainer ? 'Hide info' : 'More info'}
                </button>
              </div>
              {!user && (
                <button
                  onClick={() => showLoginDialog()}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </button>
              )}
            </div>
            <p className="text-zinc-400">
              Ask any research question and I'll help you explore the topic
            </p>
          </div>

          {showExplainer && (
            <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-2 text-white">
                <Info className="h-5 w-5" />
                <h2 className="text-lg font-semibold">How it works</h2>
              </div>
              <div className="mt-4 grid gap-4 text-zinc-400">
                <div className="flex items-start gap-2">
                  <Search className="mt-1 h-5 w-5 flex-shrink-0" />
                  <p>
                    I'll search through scientific literature to find relevant
                    information about your topic
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0" />
                  <p>
                    I'll analyze and summarize the findings in an
                    easy-to-understand way
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-1 h-5 w-5 flex-shrink-0" />
                  <p>
                    You can explore the sources and dive deeper into any aspect
                    that interests you
                  </p>
                </div>
              </div>
            </div>
          )}

          <form action={handleSubmit} className="mb-8">
            <div className="relative">
              <input
                type="text"
                name="query"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What would you like to research?"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 pr-12 text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white p-2 text-black hover:bg-zinc-100"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </form>

          <div className="mt-4 space-y-0">
            {SUGGESTED_QUERIES.map((query, index) => (
              <div key={query} className="relative">
                <button
                  type="button"
                  onClick={() => handleSuggestedQuery(query)}
                  className="w-full flex items-center justify-between px-4 py-3.5 md:py-3 text-sm text-zinc-300 hover:bg-zinc-700/50 active:bg-zinc-700/70 hover:cursor-pointer transition-colors rounded-lg group"
                >
                  <span className="text-left">{query}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-500 group-hover:text-zinc-300 transition-all flex-shrink-0 ml-2" />
                </button>
                {index < SUGGESTED_QUERIES.length - 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-700/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
