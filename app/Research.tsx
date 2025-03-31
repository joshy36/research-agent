'use client';

import { BookOpen, Clock, ExternalLink, FileText, Users } from 'lucide-react';
import { useState } from 'react';
import { getResearchInfo } from './actions';

interface ResearchResult {
  parsedQuery: {
    rawTerms: string[];
    keyTerms: string[];
  };
  articles: {
    pmid: string;
    pmcid: string;
    title: string;
    authors: string[];
    journal: string;
    pubDate: string;
    fullTextUrl: string;
  }[];
  timestamp: string;
  note?: string | null;
}

export function Research() {
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const query = formData.get('query') as string;
    if (!query) {
      setError('Please enter a research query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getResearchInfo(query);
      console.log('Raw result:', result);
      const researchData = result?.results?.structureResponse?.output;
      if (!researchData) {
        throw new Error('Invalid response structure');
      }
      setResearch(researchData as ResearchResult);
    } catch (err) {
      setError('Failed to fetch research data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestedQuery(query: string) {
    const formData = new FormData();
    formData.append('query', query);
    await handleSubmit(formData);
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-900 p-6">
      <div className="w-full max-w-4xl space-y-6">
        {/* Search Form */}
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
                className="w-full rounded-2xl border border-gray-700/50 bg-gray-800/90 p-3 pr-12 text-gray-200 placeholder-gray-500"
                disabled={loading}
              />
              <button
                type="submit"
                className="absolute top-1/2 right-2 -translate-y-1/2 transform cursor-pointer rounded-xl bg-white p-2 text-black transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-600"
                disabled={loading}
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-black border-t-transparent" />
                ) : (
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
                )}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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

        {/* Loading State */}
        {loading && (
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/80 p-6 text-gray-300 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              <span>Analyzing query and fetching research articles...</span>
            </div>
          </div>
        )}

        {/* Research Results */}
        {research && (
          <div className="space-y-6">
            {/* Query Analysis Card */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/80 p-6 shadow-lg backdrop-blur-md">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-100">
                <FileText className="h-6 w-6" />
                Query Analysis
              </h2>
              <div className="space-y-3 text-gray-300">
                <p className="text-sm">
                  <span className="font-semibold text-gray-200">
                    Raw Terms:
                  </span>{' '}
                  <span className="text-gray-400">
                    {research.parsedQuery.rawTerms.join(', ')}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-200">
                    Key Terms:
                  </span>{' '}
                  <span className="text-gray-400">
                    {research.parsedQuery.keyTerms.join(', ')}
                  </span>
                </p>
                {research.note && (
                  <p className="text-sm">
                    <span className="font-semibold text-gray-200">Note:</span>{' '}
                    <span className="text-gray-400">{research.note}</span>
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold text-gray-200">
                    Timestamp:
                  </span>{' '}
                  <span className="text-gray-400">
                    {new Date(research.timestamp).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            {/* Articles Grid */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/80 p-6 shadow-lg backdrop-blur-md">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-100">
                <BookOpen className="h-6 w-6" />
                Articles ({research.articles.length})
              </h2>
              {research.articles.length === 0 ? (
                <p className="text-gray-400">
                  No articles found for this query.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {research.articles.map((article, index) => (
                    <div
                      key={article.pmcid}
                      className="rounded-lg border border-gray-600/50 bg-gray-700/30 p-5 transition-colors hover:border-gray-500/50"
                    >
                      <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-gray-100">
                        {index + 1}. {article.title}
                      </h3>
                      <div className="space-y-3 text-sm text-gray-300">
                        <p className="flex items-start gap-2">
                          <Users className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <span>
                            <span className="font-semibold text-gray-200">
                              Authors:
                            </span>{' '}
                            <span className="text-gray-400">
                              {article.authors.join(', ')}
                            </span>
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <span>
                            <span className="font-semibold text-gray-200">
                              Journal:
                            </span>{' '}
                            <span className="text-gray-400">
                              {article.journal}
                            </span>
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <span>
                            <span className="font-semibold text-gray-200">
                              Published:
                            </span>{' '}
                            <span className="text-gray-400">
                              {article.pubDate}
                            </span>
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <span>
                            <span className="font-semibold text-gray-200">
                              PMCID:
                            </span>{' '}
                            <span className="text-gray-400">
                              {article.pmcid}
                            </span>{' '}
                            |{' '}
                            <span className="font-semibold text-gray-200">
                              PMID:
                            </span>{' '}
                            <span className="text-gray-400">
                              {article.pmid}
                            </span>
                          </span>
                        </p>
                        <a
                          href={article.fullTextUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 font-medium text-blue-400 transition-colors hover:text-blue-300"
                        >
                          <ExternalLink className="h-5 w-5" />
                          View Full Text
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
