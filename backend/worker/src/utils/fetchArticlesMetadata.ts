import { Context } from '../../../libs/types.js';

export const fetchArticlesMetadata = async (context: Context) => {
  const keyTerms = context.parsedQuery?.keyTerms;
  console.log(keyTerms);

  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const query = keyTerms?.map((term) => `${term}[mesh]`).join(' AND ');
  let searchUrl = `${baseUrl}esearch.fcgi?db=pmc&term=${encodeURIComponent(
    query ?? ''
  )}&retmax=10&retmode=json&api_key=${process.env.NCBI_API_KEY}`;

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    console.error(`ESearch failed: ${searchResponse.statusText}`);
    return { articles: [] };
  }
  const searchData: any = await searchResponse.json();

  let pmcids = searchData.esearchresult?.idlist || [];

  // If no results with AND, try OR search
  if (!pmcids.length && keyTerms?.length) {
    console.log('No results with AND search, trying OR search');
    const orQuery = keyTerms.map((term) => `${term}[mesh]`).join(' OR ');
    const orSearchUrl = `${baseUrl}esearch.fcgi?db=pmc&term=${encodeURIComponent(
      orQuery
    )}&retmax=10&retmode=json`;

    const orSearchResponse = await fetch(orSearchUrl);
    if (orSearchResponse.ok) {
      const orSearchData: any = await orSearchResponse.json();
      pmcids = orSearchData.esearchresult?.idlist || [];
    }
  }

  if (!pmcids.length) {
    console.log('No PMCIDs found for query:', query);
    return { articles: [] };
  }

  const formattedPmcids = pmcids;
  const summaryUrl = `${baseUrl}esummary.fcgi?db=pmc&id=${formattedPmcids.join(
    ','
  )}&retmode=json`;
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    console.error(`ESummary failed: ${summaryResponse.statusText}`);
    return { articles: [] };
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

  return { articles };
};
