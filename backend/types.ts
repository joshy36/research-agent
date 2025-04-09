export type State = 'step1' | 'step2' | 'step3';

export interface Context {
  taskId: string;
  message: string;
  state: State;
  parsedQuery?: {
    rawTerms: string[];
    keyTerms: string[];
  };
  articles?: {
    pmid: any;
    pmcid: any;
    title: any;
    authors: any;
    journal: any;
    pubDate: any;
    fullTextUrl: string;
  }[];
}
