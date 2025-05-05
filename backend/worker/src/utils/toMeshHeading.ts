interface ESearchResponse {
  esearchresult?: {
    idlist?: string[];
  };
}

interface ESearchTranslation {
  from: string;
  to: string; // e.g. "\"hypersensitivity\"[MeSH Terms] OR \"allergy ...\"[MeSH Terms]"
}
interface ESearchResponseFull extends ESearchResponse {
  esearchresult?: {
    translationset?: ESearchTranslation[];
  } & ESearchResponse['esearchresult'];
}

export async function toMeshHeading(term: string): Promise<string[]> {
  const url =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
    `?db=mesh&term=${encodeURIComponent(term)}&retmode=json&retmax=0&api_key=${
      process.env.NCBI_API_KEY
    }`;
  const r = (await fetch(url).then((res: any) =>
    res.json()
  )) as ESearchResponseFull;

  const trans = r.esearchresult?.translationset?.[0]?.to;
  if (!trans) return [];

  // Extract the quoted descriptor strings
  return [...trans.matchAll(/"([^"]+)"\[MeSH Terms\]/g)].map((m) => m[1] || '');
}
