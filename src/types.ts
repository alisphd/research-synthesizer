export interface PaperAnalysis {
  id: string;
  title: string;
  authors: string[];
  year: string;
  journal: string;
  summary: string;
  uniqueFindings: string[];
  gaps: string[];
  futureDirections: string[];
  tags: string[];
  doi?: string;
  url?: string;
  source?: 'demo' | 'crossref' | 'imported';
  citationCount?: number;
  createdAt?: any;
}
