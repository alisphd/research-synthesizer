import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

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

interface PdfTextItem {
  str?: string;
  transform?: number[];
  height?: number;
}

interface ExtractedLine {
  text: string;
  fontSize: number;
}

interface TitleGuess {
  title: string;
  endIndex: number;
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
  'figure',
  'table',
  'introduction',
  'abstract',
  'results',
  'method',
  'methods',
  'conclusion',
]);

let pdfWorkerConfigured = false;

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

function normalizeWhitespace(text: string) {
  return text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function cleanSentence(text: string) {
  return normalizeWhitespace(text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' '));
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

function sentenceSplit(text: string) {
  return cleanSentence(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);
}

function keywordTagsFromText(title: string, body: string, journal = '') {
  const journalTokens = journal
    .split(/[\s:/()-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 5 && !COMMON_STOP_WORDS.has(token.toLowerCase()))
    .slice(0, 1)
    .map(toTitleCase);

  const counts = new Map<string, number>();
  for (const token of `${title} ${body}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)) {
    if (token.length < 4 || COMMON_STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const rankedTokens = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([token]) => toTitleCase(token));

  return Array.from(new Set([...journalTokens, ...rankedTokens])).slice(0, 5);
}

function extractTags(title: string, journal: string, subjects: string[] = []) {
  const fromSubjects = subjects.slice(0, 3).map((subject) => subject.trim()).filter(Boolean);
  const fromText = keywordTagsFromText(title, title, journal);
  return Array.from(new Set([...fromSubjects, ...fromText])).slice(0, 5);
}

function summarizeAbstract(abstract: string | undefined, fallbackTitle: string, journal: string, year: string) {
  if (abstract) {
    const cleanAbstract = stripHtml(abstract);
    const sentences = sentenceSplit(cleanAbstract).slice(0, 2).join(' ');
    if (sentences.trim()) {
      return sentences;
    }
  }

  return `${fallbackTitle} is a ${journal || 'research'} paper published in ${year}. This summary is inferred from the available metadata or uploaded PDF text.`;
}

function fallbackSummaryFromText(text: string, title: string, journal: string, year: string) {
  const match = sentenceSplit(text).slice(0, 2).join(' ');
  return match || summarizeAbstract(undefined, title, journal, year);
}

function buildHeuristicFindings(title: string, journal: string, year: string, tags: string[], citationCount?: number) {
  const findings = [
    `Published in ${journal || 'a research venue'} in ${year}.`,
    tags.length > 0 ? `The paper centers on ${tags.join(', ')}.` : 'This work contributes to an identifiable research theme in the library.',
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

function cleanFileStem(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyTitleLine(text: string) {
  if (text.length < 12 || text.length > 220) {
    return false;
  }

  if (/^(abstract|keywords?|introduction|references)\b/i.test(text)) {
    return false;
  }

  if (/@|www\.|http|doi\.org|copyright/i.test(text)) {
    return false;
  }

  return /[A-Za-z]/.test(text);
}

function guessTitle(firstPageLines: ExtractedLine[], fileName: string): TitleGuess {
  const visibleLines = firstPageLines.slice(0, 12).map((line, index) => ({ ...line, index }));
  const candidates = visibleLines.filter((line) => isLikelyTitleLine(line.text));

  if (candidates.length === 0) {
    return { title: cleanFileStem(fileName) || 'Uploaded PDF', endIndex: -1 };
  }

  const anchor = [...candidates].sort((a, b) => b.fontSize - a.fontSize || a.index - b.index)[0];
  const collected = [anchor];
  const anchorFontSize = anchor.fontSize || 0;

  for (let index = anchor.index + 1; index < visibleLines.length; index += 1) {
    const line = visibleLines[index];
    if (!isLikelyTitleLine(line.text)) {
      break;
    }

    if (/^(abstract|keywords?|introduction)\b/i.test(line.text)) {
      break;
    }

    if (anchorFontSize > 0 && line.fontSize < anchorFontSize * 0.72) {
      break;
    }

    const combinedLength = `${collected.map((item) => item.text).join(' ')} ${line.text}`.trim().length;
    if (combinedLength > 220) {
      break;
    }

    collected.push(line);
  }

  collected.sort((a, b) => a.index - b.index);
  return {
    title: cleanSentence(collected.map((line) => line.text).join(' ')) || cleanFileStem(fileName) || 'Uploaded PDF',
    endIndex: collected[collected.length - 1]?.index ?? anchor.index,
  };
}

function sanitizeAuthorCandidate(value: string) {
  return cleanSentence(
    value
      .replace(/\b(and|email|emails?)\b/gi, ' ')
      .replace(/[\d*]+/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' '),
  );
}

function looksLikeAuthorName(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) {
    return false;
  }

  if (/\b(university|department|faculty|institute|school|laboratory|journal|conference)\b/i.test(value)) {
    return false;
  }

  return tokens.filter((token) => /^[A-Z][A-Za-z'.-]+$/.test(token)).length >= 2;
}

function guessAuthors(firstPageLines: ExtractedLine[], titleEndIndex: number) {
  const abstractIndex = firstPageLines.findIndex((line) => /^abstract\b/i.test(line.text));
  const sliceEnd = abstractIndex > -1 ? abstractIndex : Math.min(firstPageLines.length, titleEndIndex + 6);
  const authorLines = firstPageLines
    .slice(Math.max(0, titleEndIndex + 1), sliceEnd)
    .map((line) => line.text)
    .filter(
      (line) =>
        line.length > 3 &&
        line.length < 160 &&
        !/@|doi|received|accepted|published|keywords?/i.test(line) &&
        !/\b(university|department|faculty|institute|school|laboratory)\b/i.test(line),
    )
    .slice(0, 2);

  const names = authorLines
    .join(', ')
    .split(/,|;|\band\b/)
    .map(sanitizeAuthorCandidate)
    .filter(looksLikeAuthorName);

  return Array.from(new Set(names)).slice(0, 8);
}

function extractAbstract(text: string) {
  const abstractMatch = text.match(
    /\babstract\b[:\s]*([\s\S]{120,2200}?)(?:\n\s*(?:keywords?|index terms|1\.?\s*introduction|introduction)\b)/i,
  );

  if (abstractMatch?.[1]) {
    return cleanSentence(abstractMatch[1]);
  }

  return '';
}

function extractSentencesByKeywords(text: string, keywords: string[], limit: number) {
  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const picked: string[] = [];

  for (const sentence of sentenceSplit(text)) {
    const lowerSentence = sentence.toLowerCase();
    if (!loweredKeywords.some((keyword) => lowerSentence.includes(keyword))) {
      continue;
    }

    picked.push(sentence);
    if (picked.length === limit) {
      break;
    }
  }

  return Array.from(new Set(picked));
}

function findYear(text: string) {
  const matches = text.match(/\b(19[89]\d|20\d{2}|203[0-5])\b/g);
  return matches?.[0] ?? 'Unknown';
}

function findDoi(text: string) {
  const match = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i);
  return match?.[0];
}

function guessJournal(firstPageLines: ExtractedLine[], fullText: string) {
  const candidateLine = [...firstPageLines, { text: fullText, fontSize: 0 }].find((line) =>
    /\b(journal|conference|proceedings|transactions|symposium|workshop|arxiv)\b/i.test(line.text),
  );

  return candidateLine ? cleanSentence(candidateLine.text).slice(0, 120) : 'Uploaded PDF';
}

async function getPdfModule() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    pdfWorkerConfigured = true;
  }

  return pdfjs;
}

function groupTextItemsIntoLines(items: PdfTextItem[]) {
  const rows: Array<{ y: number; entries: Array<{ x: number; text: string }>; fontSize: number }> = [];

  for (const item of items) {
    const text = item.str?.trim();
    if (!text) {
      continue;
    }

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const fontSize = Math.abs(item.height ?? item.transform?.[0] ?? 0);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2.5);

    if (!row) {
      row = { y, entries: [], fontSize };
      rows.push(row);
    }

    row.entries.push({ x, text });
    row.fontSize = Math.max(row.fontSize, fontSize);
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map<ExtractedLine>((row) => ({
      text: cleanSentence(
        row.entries
          .sort((a, b) => a.x - b.x)
          .map((entry) => entry.text)
          .join(' ')
          .replace(/\s+([,.;:])/g, '$1'),
      ),
      fontSize: row.fontSize,
    }))
    .filter((line) => line.text.length > 0);
}

async function extractPdfText(file: File, maxPages = 8) {
  const pdfjs = await getPdfModule();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pageTexts: string[] = [];
  let firstPageLines: ExtractedLine[] = [];

  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, maxPages); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageLines = groupTextItemsIntoLines(textContent.items as PdfTextItem[]);

    if (pageNumber === 1) {
      firstPageLines = pageLines;
    }

    pageTexts.push(pageLines.map((line) => line.text).join('\n'));
  }

  return {
    fullText: normalizeWhitespace(pageTexts.join('\n\n')),
    firstPageLines,
  };
}

export function getDemoLibrary() {
  return demoLibrary.map((paper) => ({ ...paper }));
}

export async function analyzeUploadedPdf(file: File): Promise<PaperAnalysis> {
  const { fullText, firstPageLines } = await extractPdfText(file);
  if (!fullText.trim()) {
    throw new Error('No readable text was extracted from the PDF.');
  }

  const { title, endIndex } = guessTitle(firstPageLines, file.name);
  const authors = guessAuthors(firstPageLines, endIndex);
  const abstract = extractAbstract(fullText);
  const year = findYear(`${file.name}\n${fullText}`);
  const doi = findDoi(fullText);
  const journal = guessJournal(firstPageLines, fullText);
  const tags = keywordTagsFromText(title, abstract || fullText.slice(0, 3000), journal);
  const findings =
    extractSentencesByKeywords(fullText, ['we propose', 'we present', 'we show', 'we demonstrate', 'our results'], 3) ||
    [];
  const gaps = extractSentencesByKeywords(fullText, ['limitation', 'limitations', 'challenge', 'however', 'remain'], 2);
  const futureDirections = extractSentencesByKeywords(
    fullText,
    ['future work', 'future research', 'further work', 'can be extended', 'next step'],
    2,
  );

  return {
    id: `uploaded-${slugify(cleanFileStem(file.name) || title)}-${Date.now().toString(36)}`,
    title: title || cleanFileStem(file.name) || 'Uploaded PDF',
    authors: authors.length > 0 ? authors : ['Unknown author'],
    year,
    journal,
    summary: abstract ? summarizeAbstract(abstract, title, journal, year) : fallbackSummaryFromText(fullText, title, journal, year),
    uniqueFindings: findings.length > 0 ? findings : buildHeuristicFindings(title, journal, year, tags),
    gaps: gaps.length > 0 ? gaps : buildHeuristicGaps(tags),
    futureDirections: futureDirections.length > 0 ? futureDirections : buildHeuristicFutureDirections(tags),
    tags: tags.length > 0 ? tags : ['Uploaded PDF'],
    doi,
    url: doi ? `https://doi.org/${doi}` : undefined,
    source: 'uploaded',
  };
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
This showcase library contains **${papers.length} papers** spanning **${yearRange}**. The synthesis below is generated from stored metadata, uploaded PDF text, tags, and heuristics rather than external LLM calls.

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
The strongest matches in your library point to **${commonThemes || 'a set of related research themes'}**. This answer is generated from stored metadata, uploaded PDF text, and saved notes in the showcase app.

## Evidence from Your Library
${evidence}

## Recurring Gaps
${recurringGaps || '- Add more papers to identify recurring gaps more reliably.'}`;
}
