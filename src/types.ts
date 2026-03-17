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
  createdAt?: any;
}
