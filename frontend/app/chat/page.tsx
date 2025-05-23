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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [messageLimit, setMessageLimit] = useState({
    count: 0,
    limit: 5, // Default limit, will be updated from API
    resetDate: null as null | string,
  });
  const [loadingLimit, setLoadingLimit] = useState(false);

  const isLimitReached = !!user && messageLimit.count >= messageLimit.limit;

  const fetchMessageLimit = async () => {
    if (!user) {
      setLoadingLimit(false);
      // Reset to defaults if no user
      setMessageLimit({ count: 0, limit: 5, resetDate: null });
      return;
    }
    setLoadingLimit(true);
    setError(null); // Clear previous errors
    try {
      const url =
        process.env.NEXT_PUBLIC_API_URL +
        `/api/message-limit-status?userId=${user.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessageLimit({
          count: data.count,
          limit: data.limit,
          resetDate: data.resetDate, // Store as string from API
        });
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch message limit status:', errorText);
        setError(
          'Could not retrieve usage limit. Querying is temporarily disabled.',
        );
        setMessageLimit((prev) => ({ ...prev, count: prev.limit })); // Assume limit reached
      }
    } catch (e) {
      console.error('Network error fetching message limit:', e);
      setError(
        'Network error. Querying is temporarily disabled while checking usage limits.',
      );
      setMessageLimit((prev) => ({ ...prev, count: prev.limit })); // Assume limit reached
    } finally {
      setLoadingLimit(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessageLimit();
    } else {
      // Reset limit state and clear error if user logs out or is not present initially
      setMessageLimit({ count: 0, limit: 5, resetDate: null });
      setLoadingLimit(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(formData: FormData) {
    if (!user) {
      showLoginDialog();
      return;
    }

    if (isLimitReached) {
      setError(
        `You've reached your query limit of ${messageLimit.limit}.` +
          (messageLimit.resetDate
            ? ` It resets on ${new Date(messageLimit.resetDate).toLocaleString()}.`
            : ''),
      );
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

      router.push(`/chat/${result.chatId}?tab=research`);
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

    if (isLimitReached) {
      setError(
        `You've reached your query limit of ${messageLimit.limit}.` +
          (messageLimit.resetDate
            ? ` It resets on ${new Date(messageLimit.resetDate).toLocaleString()}.`
            : ''),
      );
      return;
    }

    const formData = new FormData();
    formData.append('query', query);
    await handleSubmit(formData);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mx-auto max-w-3xl h-full flex flex-col">
          <div className="flex-1">
            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="flex flex-col items-center gap-2">
                <Image
                  src="/panacea-2.png"
                  alt="Panace Logo"
                  width={100}
                  height={100}
                  className="rounded-lg sm:w-[160px] sm:h-[160px]"
                />
                <h1 className="text-3xl sm:text-4xl font-bold text-white font-roboto-slab text-center">
                  PANACEA
                </h1>
              </div>
              {!user && (
                <button
                  onClick={() => showLoginDialog()}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer w-full sm:w-auto justify-center"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <p className="text-zinc-400 text-sm text-center">
                  Discover insights from scientific literature. Not a doctor.
                </p>
                <button
                  onClick={() => setShowExplainer(!showExplainer)}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300 hover:underline transition-colors cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                  {showExplainer ? 'Hide info' : 'More info'}
                </button>
              </div>
            </div>

            <form action={handleSubmit} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  name="query"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onClick={() => !user && showLoginDialog()}
                  placeholder="What would you like to research?"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 pr-12 text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
                  disabled={(!!user && loadingLimit) || isLimitReached}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white p-2 text-black hover:bg-zinc-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    !input.trim() || (!!user && loadingLimit) || isLimitReached
                  }
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              {user &&
                !error && ( // Only show limit info if logged in and no other critical error
                  <div className="mt-2 text-sm text-zinc-400 text-center">
                    {loadingLimit ? (
                      'Loading usage limit...'
                    ) : isLimitReached ? (
                      <>
                        Weekly query limit reached.
                        {messageLimit.resetDate &&
                          ` Resets: ${new Date(
                            messageLimit.resetDate,
                          ).toLocaleString()}`}
                      </>
                    ) : (
                      <>
                        Queries used: {messageLimit.count} /{' '}
                        {messageLimit.limit}
                        {messageLimit.resetDate &&
                          ` (Resets: ${new Date(
                            messageLimit.resetDate,
                          ).toLocaleString()})`}
                      </>
                    )}
                  </div>
                )}
            </form>

            {showExplainer && (
              <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                <div className="flex items-center gap-1.5 text-white">
                  <Info className="h-4 w-4" />
                  <h2 className="text-base font-medium">How it works</h2>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-400">
                  <div className="flex items-start gap-1.5">
                    <Search className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Search through scientific literature to find relevant
                      information about your topic
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Analyze and summarize the findings in an
                      easy-to-understand way
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Explore the sources and dive deeper into any aspect that
                      interests you
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-0">
              {SUGGESTED_QUERIES.map((query, index) => (
                <div key={query} className="relative">
                  <button
                    type="button"
                    onClick={() => handleSuggestedQuery(query)}
                    className="w-full flex items-center justify-between px-3 sm:px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700/50 active:bg-zinc-700/70 hover:cursor-pointer transition-colors rounded-lg group"
                    disabled={(!!user && loadingLimit) || isLimitReached}
                  >
                    <span className="text-left line-clamp-2">{query}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-500 group-hover:text-zinc-300 transition-all flex-shrink-0 ml-2" />
                  </button>
                  {index < SUGGESTED_QUERIES.length - 1 && (
                    <div className="absolute bottom-0 left-2 right-2 h-px bg-zinc-700/50" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
              <Link
                href="/legal/tos"
                className="hover:text-zinc-400 transition-colors"
              >
                Terms of Service
              </Link>
              <span>•</span>
              <Link
                href="/legal/privacy"
                className="hover:text-zinc-400 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
