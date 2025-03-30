import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface SearchResult {
  esearchresult: {
    idlist: string[];
  };
}

interface ArticleDetails {
  pmid: string;
  pmcid: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  fullTextUrl: string;
}

async function fetchPMCOpenAccessMetadata(
  terms: any[]
): Promise<ArticleDetails[]> {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

  if (!Array.isArray(terms) || terms.length === 0) {
    return [];
  }

  // Use plain ' AND ' instead of '+AND+'
  const query = terms.map((term) => `${term}[mesh]`).join(' AND ');
  const searchUrl = `${baseUrl}esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=2&retmode=json`;
  console.log('bs: ', query);
  console.log('bs: ', searchUrl);

  const searchResponse = await fetch(searchUrl);
  console.log('bs: ', searchResponse);
  if (!searchResponse.ok) {
    throw new Error(`ESearch failed: ${searchResponse.statusText}`);
  }
  const searchData = (await searchResponse.json()) as SearchResult;
  console.log('bs: Search Data:', searchData);

  const pmcids = searchData.esearchresult.idlist || [];
  console.log('bs: PMCIDs:', pmcids);
  if (!pmcids.length) {
    console.log('No PMCIDs found for query:', query);
    return [];
  }

  // Add "PMC" prefix to each PMCID
  const formattedPmcids = pmcids;
  const summaryUrl = `${baseUrl}esummary.fcgi?db=pmc&id=${formattedPmcids.join(',')}&retmode=json`;
  console.log('bs: Summary URL:', summaryUrl);
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    throw new Error(`ESummary failed: ${summaryResponse.statusText}`);
  }
  const summaryData = await summaryResponse.json();
  console.log('bs: Summary Data:', summaryData);

  const articles: ArticleDetails[] = Object.values(summaryData.result || {})
    .filter((item: any) => item.uid)
    .map((item: any) => {
      const pmcid = item.uid; // Already includes "PMC" from formattedPmcids
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

  return articles;
}

export const getArticlesMetadataTool = createTool({
  id: 'getOpenAccessArticlesMetadata',
  description:
    'Fetches metadata for the top 2 open access PMC articles based on an array of MeSH terms',
  inputSchema: z.object({
    query: z
      .array(z.any())
      .describe('An array of MeSH terms (e.g., ["asthma", "leukotrienes"])'),
  }),
  outputSchema: z.object({
    articles: z.array(
      z.object({
        pmid: z.string(),
        pmcid: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        journal: z.string(),
        pubDate: z.string(),
        fullTextUrl: z.string(),
      })
    ),
    query: z.array(z.string()),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const articles = await fetchPMCOpenAccessMetadata(context.query);
    console.log('Final Articles Array:', articles);
    return {
      articles,
      query: context.query,
      timestamp: new Date().toISOString(),
    };
  },
});
