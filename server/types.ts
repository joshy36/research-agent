export type State = 'step1' | 'step2' | 'step3';

export interface Context {
  message: string;
  state: State;
  parsedQuery: {
    rawTerms: string[];
    keyTerms: string[];
  };
}
