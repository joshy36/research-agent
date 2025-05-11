'use client';

import { useAuth } from '@/providers/AuthProvider';
import {
  BookOpen,
  ChevronRight,
  FileText,
  Info,
  Lightbulb,
  Search,
  X,
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
          <div className="pt-16 md:pt-64 py-4 md:py-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
                What would you like to research?
              </h1>
              <button
                onClick={() => setShowExplainer(!showExplainer)}
                className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${
                  showExplainer
                    ? 'bg-zinc-700/50 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                }`}
                title="Learn more about this tool"
              >
                {showExplainer ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
              </button>
            </div>

            {showExplainer && (
              <div className="max-w-2xl mx-auto mb-8 text-center animate-fadeIn">
                <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
                  <div className="space-y-4 relative">
                    <p className="text-zinc-300 text-base md:text-lg leading-relaxed">
                      Discover evidence-based insights from scientific
                      literature. Our AI analyzes research papers to provide you
                      with accurate, up-to-date information on any topic.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 justify-center text-sm">
                      <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2.5 rounded-lg border border-blue-500/20">
                        <BookOpen className="h-4 w-4 text-blue-400" />
                        <span className="text-zinc-300">
                          Real scientific papers
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2.5 rounded-lg border border-green-500/20">
                        <Lightbulb className="h-4 w-4 text-green-400" />
                        <span className="text-zinc-300">
                          Evidence-based insights
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-2.5 rounded-lg border border-purple-500/20">
                        <FileText className="h-4 w-4 text-purple-400" />
                        <span className="text-zinc-300">Clear summaries</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  className="w-full rounded-lg bg-zinc-800/80 backdrop-blur-sm pl-4 pr-12 py-3.5 md:py-3 text-white placeholder:text-zinc-400 border border-zinc-700/50 focus:outline-none focus:border-zinc-600 text-base"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md cursor-pointer p-2.5 md:p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent disabled:cursor-auto transition-colors border border-zinc-700/50"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

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
