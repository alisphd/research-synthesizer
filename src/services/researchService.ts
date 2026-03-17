import { demoLibrary } from '../data/demoLibrary';
import { PaperAnalysis } from '../types';

interface CrossrefAuthor {
  given?: string;
  family?: string;
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  'container-title'?: string[];
  issued?: {
    'date-parts'?: (number | null)[][];
  };
  subject?: string[];
  abstract?: string;
  URL?: string;
  'is-referenced-by-count'?: number;
}

interface CrossrefResponse {
  message?: {
    items?: CrossrefWork[];
  };
}

const CROSSREF_MAILTO = '86947606+Saqibali223@users.noreply.github.com';
const COMMON_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'using',
  'based',
  'study',
  'toward',
  'towards',
  'their',
  'this',
  'that',
  'these',
  'those',
  'over',
  'under',
  'between',
  'through',
  'across',
  'model',
  'models',
  'analysis',
  'research',
  'paper',
  'approach',
]);

function decodeHtmlEntities(text: string) {
  if (typeof window === 'undefined') {
    return text;
  }

  const textarea = window.document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function stripHtml(text: string) {
  return decodeHtmlEntities(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toTitleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function yearFromDateParts(dateParts?: (number | null)[][]) {
  const year = dateParts?.[0]?.[0];
  return typeof year === 'number' ? String(year) : 'Unknown';
}

function authorName(author: CrossrefAuthor) {
  return [author.given, author.family].filter(Boolean).join(' ').trim();
}

function extractTags(title: string, journal: string, subjects: string[] = []) {
  const fromSubjects = subjects.slice(0, 3).map((subject) => subject.trim()).filter(Boolean);
  const fromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !COMMON_STOP_WORDS.has(word))
    .slice(0, 3)
    .map(toTitleCase);

  const fromJournal = journal
    .split(/[\s:/()-]+/)
    .filter((word) => word.length > 5 && !COMMON_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 1)
    .map(toTitleCase);

  return Array.from(new Set([...fromSubjects, ...fromTitle, ...fromJournal])).slice(0, 5);
}

function summarizeAbstract(abstract: string | undefined, fallbackTitle: string, journal: string, year: string) {
  if (abstract) {
    const cleanAbstract = stripHtml(abstract);
    const sentences = cleanAbstract.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    if (sentences.trim()) {
      return sentences;
    }
  }

  return `${fallbackTitle} is a ${journal || 'research'} paper published in ${year}. This showcase summary is inferred from public metadata rather than full-text analysis.`;
}

function buildHeuristicFindings(title: string, journal: string, year: string, tags: string[], citationCount?: number) {
  const findings = [
    `Published in ${journal || 'a research venue'} in ${year}.`,
    tags.length > 0 ? `Crossref metadata associates this work with ${tags.join(', ')}.` : 'This work contributes to an identifiable research theme in the library.',
  ];

  if (typeof citationCount === 'number') {
    findings.push(`Crossref currently reports ${citationCount} citation${citationCount === 1 ? '' : 's'} for this record.`);
  }

  findings.push(`The title suggests a focus on ${title.toLowerCase().includes('transformer') ? 'transformer-based methods' : 'domain-specific methodology and evaluation'}.`);
  return findings;
}

function buildHeuristicGaps(tags: string[]) {
  const firstTag = tags[0]?.toLowerCase() ?? 'the reported methods';
  return [
    `Benchmark coverage and reproducibility details for ${firstTag} can likely be expanded.`,
    'Cross-study comparison would benefit from more standardized evaluation setups.',
  ];
}

function buildHeuristicFutureDirections(tags: string[]) {
  const firstTag = tags[0]?.toLowerCase() ?? 'this line of work';
  return [
    `Extend ${firstTag} to broader datasets, settings, or user populations.`,
    'Improve interpretability, efficiency, and real-world validation.',
  ];
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !COMMON_STOP_WORDS.has(word));
}

function scorePaper(paper: PaperAnalysis, question: string) {
  const questionTokens = tokenize(question);
  const haystack = [
    paper.title,
    paper.journal,
    paper.summary,
    paper.tags.join(' '),
    paper.gaps.join(' '),
    paper.futureDirections.join(' '),
    paper.uniqueFindings.join(' '),
    paper.authors.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const token of questionTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
    if (paper.tags.some((tag) => tag.toLowerCase().includes(token))) {
      score += 2;
    }
    if (paper.title.toLowerCase().includes(token)) {
      score += 2;
    }
  }

  return score;
}

function citationLabel(paper: PaperAnalysis) {
  const leadAuthor = paper.authors[0]?.split(' ').slice(-1)[0] ?? 'Unknown';
  return `[${leadAuthor}, ${paper.year}]`;
}

function topCounts(values: string[], limit = 4) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function uniqueById(papers: PaperAnalysis[]) {
  const seen = new Set<string>();
  return papers.filter((paper) => {
    if (seen.has(paper.id)) {
      return false;
    }

    seen.add(paper.id);
    return true;
  });
}

function mapCrossrefWorkToPaper(work: CrossrefWork): PaperAnalysis | null {
  const title = stripHtml(work.title?.[0] ?? '');
  if (!title) {
    return null;
  }

  const authors = (work.author ?? []).map(authorName).filter(Boolean);
  const year = yearFromDateParts(work.issued?.['date-parts']);
  const journal = stripHtml(work['container-title']?.[0] ?? 'Crossref result');
  const tags = extractTags(title, journal, work.subject ?? []);
  const citationCount = work['is-referenced-by-count'] ?? 0;
  const summary = summarizeAbstract(work.abstract, title, journal, year);

  return {
    id: work.DOI ? `crossref-${slugify(work.DOI)}` : `crossref-${slugify(title)}`,
    title,
    authors: authors.length > 0 ? authors : ['Unknown author'],
    year,
    journal,
    summary,
    uniqueFindings: buildHeuristicFindings(title, journal, year, tags, citationCount),
    gaps: buildHeuristicGaps(tags),
    futureDirections: buildHeuristicFutureDirections(tags),
    tags: tags.length > 0 ? tags : ['Research'],
    doi: work.DOI,
    url: work.URL,
    source: 'crossref',
    citationCount,
  };
}

export function getDemoLibrary() {
  return demoLibrary.map((paper) => ({ ...paper }));
}

export async function searchPublicPapers(query: string): Promise<PaperAnalysis[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.bibliographic', trimmedQuery);
  url.searchParams.set('rows', '6');
  url.searchParams.set('filter', 'type:journal-article');
  url.searchParams.set(
    'select',
    'DOI,title,author,container-title,issued,subject,abstract,URL,type,is-referenced-by-count',
  );
  url.searchParams.set('mailto', CROSSREF_MAILTO);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Crossref request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as CrossrefResponse;
  const papers = (payload.message?.items ?? [])
    .map(mapCrossrefWorkToPaper)
    .filter((paper): paper is PaperAnalysis => paper !== null);

  return uniqueById(papers);
}

export async function synthesizeDomain(papers: PaperAnalysis[]): Promise<string> {
  if (papers.length === 0) {
    return '## Overview\nAdd papers to generate a showcase synthesis.';
  }

  const years = papers.map((paper) => Number.parseInt(paper.year, 10)).filter(Number.isFinite);
  const yearRange =
    years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : 'multiple publication years';
  const topThemes = topCounts(papers.flatMap((paper) => paper.tags), 5);
  const topJournals = topCounts(papers.map((paper) => paper.journal), 3);
  const topGaps = topCounts(papers.flatMap((paper) => paper.gaps), 3);
  const topFutureDirections = topCounts(papers.flatMap((paper) => paper.futureDirections), 3);

  const themesLine = topThemes.map(([theme, count]) => `- ${theme} (${count})`).join('\n');
  const journalsLine = topJournals.map(([journal, count]) => `- ${journal} (${count})`).join('\n');
  const gapsLine = topGaps.map(([gap]) => `- ${gap}`).join('\n');
  const futureLine = topFutureDirections.map(([direction]) => `- ${direction}`).join('\n');

  return `## Overall Domain Summary
This showcase library contains **${papers.length} papers** spanning **${yearRange}**. The synthesis below is generated from stored metadata, tags, and heuristics rather than full-text LLM analysis.

## Key Themes & Unique Findings
${themesLine || '- Themes will appear once papers include richer tags.'}

Representative venues:
${journalsLine || '- Venue information will appear once papers are added.'}

## Persistent Research Gaps
${gapsLine || '- Add more papers to surface recurring gaps.'}

## Future Trajectory
${futureLine || '- Add more papers to surface recurring future directions.'}`;
}

export async function chatWithLibrary(papers: PaperAnalysis[], question: string): Promise<string> {
  if (papers.length === 0) {
    return 'Add papers first, then ask a question about themes, gaps, or trends.';
  }

  const rankedPapers = [...papers]
    .map((paper) => ({ paper, score: scorePaper(paper, question) }))
    .sort((a, b) => b.score - a.score);

  const topMatches = rankedPapers.filter((item) => item.score > 0).slice(0, 3);
  const fallbackMatches = rankedPapers.slice(0, 3);
  const selectedMatches = topMatches.length > 0 ? topMatches : fallbackMatches;

  const commonThemes = topCounts(selectedMatches.flatMap((item) => item.paper.tags), 4)
    .map(([theme]) => theme)
    .join(', ');

  const evidence = selectedMatches
    .map(({ paper }) => `- ${citationLabel(paper)} ${paper.summary}`)
    .join('\n');

  const recurringGaps = topCounts(selectedMatches.flatMap((item) => item.paper.gaps), 2)
    .map(([gap]) => `- ${gap}`)
    .join('\n');

  return `## Quick Take
The strongest matches in your library point to **${commonThemes || 'a set of related research themes'}**. This answer is generated from metadata and saved notes in the showcase app.

## Evidence from Your Library
${evidence}

## Recurring Gaps
${recurringGaps || '- Add more papers to identify recurring gaps more reliably.'}`;
}
