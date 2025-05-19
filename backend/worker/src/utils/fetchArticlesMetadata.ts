import { Context } from '../../../libs/types.js';
import { generateText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const searchNcbi = async (query: string, apiKey?: string) => {
  console.log('🔍 Executing NCBI search with query:', query);
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const searchUrl = `${baseUrl}esearch.fcgi?db=pmc&term=${encodeURIComponent(
    query
  )}&retmax=10&retmode=json${apiKey ? `&api_key=${apiKey}` : ''}`;

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    console.error('❌ NCBI search failed:', searchResponse.statusText);
    throw new Error(`ESearch failed: ${searchResponse.statusText}`);
  }
  const searchData: any = await searchResponse.json();
  const pmcids = searchData.esearchresult?.idlist || [];
  console.log(`✅ Found ${pmcids.length} articles for query: ${query}`);
  return pmcids;
};

export const fetchArticleDetails = async (pmcids: string[]) => {
  console.log('📚 Fetching details for', pmcids.length, 'articles');
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const summaryUrl = `${baseUrl}esummary.fcgi?db=pmc&id=${pmcids.join(
    ','
  )}&retmode=json`;
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    console.error(
      '❌ Failed to fetch article details:',
      summaryResponse.statusText
    );
    throw new Error(`ESummary failed: ${summaryResponse.statusText}`);
  }
  const summaryData: any = await summaryResponse.json();

  const articles = Object.values(summaryData.result || {})
    .filter((item: any) => item.uid)
    .map((item: any) => {
      const pmcid = item.uid;
      return {
        pmid:
          item.articleids?.find((id: any) => id.idtype === 'pmid')?.value ||
          'Unknown',
        pmcid,
        title: item.title || 'No title available',
        authors: item.authors?.map((a: any) => a.name) || ['Unknown'],
        journal: item.fulljournalname || item.source || 'Unknown',
        pubDate:
          item.pubdate || item.epubdate || item.printpubdate || 'Unknown',
        fullTextUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`,
      };
    });

  console.log(
    '✅ Successfully fetched details for',
    articles.length,
    'articles'
  );
  return articles;
};

export const fetchArticlesMetadata = async (context: Context) => {
  const keyTerms = context.parsedQuery?.keyTerms;
  console.log('🎯 Starting article search with key terms:', keyTerms);

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  let allPmcids: string[] = [];

  await generateText({
    model: openrouter.chat('openai/o3-mini'),
    maxSteps: 5,
    tools: {
      searchNcbi: tool({
        description: 'Search NCBI PubMed Central for articles using a query',
        parameters: z.object({
          query: z
            .string()
            .describe(
              'The search query to use, including MeSH terms and boolean operators'
            ),
        }),
        execute: async ({ query }) => {
          const pmcids = await searchNcbi(query, process.env.NCBI_API_KEY);
          // Filter out PMCIDs we've already found
          const newPmcids = pmcids.filter(
            (id: string) => !allPmcids.includes(id)
          );
          console.log(`📈 Found ${newPmcids.length} new unique articles`);
          // Add the PMCIDs to our running list
          allPmcids = [...new Set([...allPmcids, ...newPmcids])];
          return { pmcids: newPmcids, query };
        },
      }),
    },
    prompt: `You are a research assistant helping to find relevant scientific articles. Given these key terms: ${keyTerms?.join(
      ', '
    )}, create and execute a search strategy to find relevant articles in PubMed Central.

Current status:
- We have found ${allPmcids.length} articles so far
- We need at least 15 articles total
- You have 5 steps to try different search strategies

Your task:
1. Create an effective search query using MeSH terms and boolean operators
2. Use the searchNcbi tool to execute your search
3. If we don't have enough articles, try alternative strategies
4. Explain your search strategy and results

Remember to:
- Use proper MeSH term syntax (e.g., "term[mesh]")
- Use boolean operators (AND, OR) appropriately
- Try different combinations if initial searches fail
- Focus on finding new articles we haven't found yet
- If we have some articles, try to broaden the search to find more
- You have 5 steps total to try different search strategies

The searchNcbi tool will return PMCIDs for any new articles found. You don't need to manually list them in your response.`,
  });

  console.log(`📊 Final article count: ${allPmcids.length}`);

  if (allPmcids.length === 0) {
    console.log('❌ No articles found');
  }

  return allPmcids;
};
