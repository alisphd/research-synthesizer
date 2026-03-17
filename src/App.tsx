import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, BrainCircuit, Trash2, Loader2, ChevronRight, BookOpen, Sparkles, Moon, Sun, Menu, X, Download, UploadCloud, Database, Target, MessageSquare, Network, Search, Tag, Quote, Send, ExternalLink, Plus } from 'lucide-react';
import Markdown from 'react-markdown';
import { PaperAnalysis } from './types';
import { getStoredLibrary, saveLibrary } from './lib/libraryStorage';
import { chatWithLibrary, getDemoLibrary, searchPublicPapers, synthesizeDomain } from './services/researchService';
import { cn } from './lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';

export default function App() {
  const [papers, setPapers] = useState<PaperAnalysis[]>(() => getStoredLibrary());
  const [activeTab, setActiveTab] = useState<'papers' | 'metadata' | 'gaps' | 'synthesis' | 'chat' | 'graph'>('papers');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('transformer attention');
  const [discoverResults, setDiscoverResults] = useState<PaperAnalysis[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    saveLibrary(papers);
  }, [papers]);

  const mergePapers = (incoming: PaperAnalysis[]) => {
    setPapers((prev) => {
      const merged = [...incoming, ...prev];
      const seen = new Set<string>();
      return merged.filter((paper) => {
        if (seen.has(paper.id)) {
          return false;
        }

        seen.add(paper.id);
        return true;
      });
    });
  };

  const addPaperToLibrary = (paper: PaperAnalysis) => {
    mergePapers([paper]);
    setSelectedPaperId(paper.id);
    setActiveTab('papers');
    setSynthesisResult(null);
    setDiscoverResults((prev) => prev.filter((item) => item.id !== paper.id));
  };

  const handleLoadDemoLibrary = () => {
    const demoPapers = getDemoLibrary();
    mergePapers(demoPapers);
    setSelectedPaperId((current) => current ?? demoPapers[0]?.id ?? null);
    setActiveTab('papers');
    setSynthesisResult(null);
    setDiscoverResults([]);
    setDiscoverError(null);
  };

  const handleDiscoverPapers = async () => {
    if (!discoverQuery.trim()) {
      return;
    }

    setIsDiscovering(true);
    setDiscoverError(null);
    try {
      const results = await searchPublicPapers(discoverQuery);
      const existingIds = new Set(papers.map((paper) => paper.id));
      setDiscoverResults(results.filter((paper) => !existingIds.has(paper.id)));
      setActiveTab('papers');
    } catch (error) {
      console.error('Error fetching public papers:', error);
      setDiscoverError('Could not fetch papers right now. Please try another topic or load the demo library.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSynthesize = async () => {
    if (papers.length === 0) return;
    setIsSynthesizing(true);
    setActiveTab('synthesis');
    try {
      const result = await synthesizeDomain(papers);
      setSynthesisResult(result);
    } catch (error) {
      console.error("Error synthesizing domain:", error);
      alert("Failed to synthesize. See console for details.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const removePaper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setPapers(prev => prev.filter(p => p.id !== id));

    if (selectedPaperId === id) {
      setSelectedPaperId(null);
    }
    setSynthesisResult(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(papers, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'research-synth-data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedPapers = JSON.parse(event.target?.result as string) as PaperAnalysis[];
        if (Array.isArray(importedPapers)) {
          setPapers(importedPapers.map((paper) => ({ ...paper, source: paper.source ?? 'imported' })));
          setSynthesisResult(null);
          setSelectedPaperId(null);
        }
      } catch (error) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || papers.length === 0) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const response = await chatWithLibrary(papers, userMsg);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error answering that." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const generateCitation = (paper: PaperAnalysis) => {
    const authors = paper.authors?.join(', ') || 'Unknown Author';
    const citation = `${authors} (${paper.year}). ${paper.title}. ${paper.journal}.`;
    navigator.clipboard.writeText(citation);
    alert('Citation copied to clipboard!');
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    papers.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [papers]);

  const filteredPapers = useMemo(() => {
    return papers.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.authors?.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag ? p.tags?.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    });
  }, [papers, searchQuery, selectedTag]);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Add paper nodes
    papers.forEach(p => {
      nodes.push({ id: p.id, name: p.title, group: 'paper', val: 2 });
      // Add tag nodes and links
      p.tags?.forEach(tag => {
        if (!nodes.find(n => n.id === `tag-${tag}`)) {
          nodes.push({ id: `tag-${tag}`, name: tag, group: 'tag', val: 1 });
        }
        links.push({ source: p.id, target: `tag-${tag}` });
      });
    });
    
    return { nodes, links };
  }, [papers]);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);

  // Data for visualizations
  const papersPerYear = papers.reduce((acc, paper) => {
    acc[paper.year] = (acc[paper.year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.entries(papersPerYear)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const allGaps = papers.flatMap(p => (p.gaps || []).map(gap => ({ paperTitle: p.title, gap, year: p.year })));
  const focusedShellClass = 'w-full max-w-[1280px] mx-auto p-4 pt-20 md:px-6 md:pt-8 xl:px-10';
  const wideShellClass = 'w-full max-w-[1500px] mx-auto p-4 pt-20 md:px-6 md:pt-8 xl:px-10';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 md:h-screen md:overflow-hidden">
      
      {/* Mobile Floating Menu Button */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 w-full max-w-[22rem] md:max-w-none md:w-[22rem] xl:w-[24rem] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl md:shadow-none z-40 transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex p-6 border-b border-slate-100 dark:border-slate-800 justify-between items-start">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BrainCircuit className="w-6 h-6" />
              Research Synth
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Accumulate & synthesize</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Showcase mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No sign-in or private API keys. Load the demo library, fetch public paper metadata from Crossref, or use JSON import/export.
            </p>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-2">
          <button
            onClick={() => { setActiveTab('papers'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'papers' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Papers Library
            <span className="ml-auto bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {papers.length}
            </span>
          </button>
          
          <button
            onClick={() => { setActiveTab('metadata'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'metadata' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Database className="w-4 h-4" />
            Metadata & Stats
          </button>

          <button
            onClick={() => { setActiveTab('gaps'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'gaps' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Target className="w-4 h-4" />
            Research Gaps
          </button>

          <button
            onClick={() => { setActiveTab('synthesis'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'synthesis' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Domain Synthesis
          </button>

          <button
            onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'chat' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Library
          </button>

          <button
            onClick={() => { setActiveTab('graph'); setIsMobileMenuOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'graph' 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Network className="w-4 h-4" />
            Knowledge Graph
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {activeTab === 'papers' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search papers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                        selectedTag === null
                          ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      All
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                          selectedTag === tag
                            ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(discoverResults.length > 0 || discoverError) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
                    Discover Results
                  </div>
                  {discoverError && (
                    <div className="text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl px-3 py-2">
                      {discoverError}
                    </div>
                  )}
                  {discoverResults.map((paper) => (
                    <div
                      key={paper.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 px-3 py-3 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Search className="w-4 h-4 text-indigo-500 dark:text-indigo-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                            {paper.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {paper.year} · {paper.journal}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => addPaperToLibrary(paper)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to library
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
                Added Papers ({filteredPapers.length})
              </div>
              {filteredPapers.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  {papers.length === 0 ? "No papers yet. Load the demo library, fetch Crossref results, or import JSON to begin." : "No papers match your search."}
                </div>
              ) : (
                filteredPapers.map(paper => (
                  <div
                    key={paper.id}
                    onClick={() => setSelectedPaperId(paper.id)}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                      selectedPaperId === paper.id
                        ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-500/20"
                        : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <FileText className={cn(
                      "w-4 h-4 mt-0.5 shrink-0",
                      selectedPaperId === paper.id ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate" title={paper.title}>
                        {paper.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{paper.year}</p>
                      {paper.tags && paper.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {paper.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                              {tag}
                            </span>
                          ))}
                          {paper.tags.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                              +{paper.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => removePaper(paper.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Discover papers</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Search Crossref for public research metadata and add matching papers to the showcase library.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="Try: transformers, glaucoma, climate adaptation"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDiscoverPapers}
                  disabled={isDiscovering || !discoverQuery.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white transition-colors"
                >
                  {isDiscovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {isDiscovering ? 'Searching...' : 'Fetch from Crossref'}
                </button>
                <button
                  onClick={handleLoadDemoLibrary}
                  className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Load demo
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={papers.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={importInputRef}
              onChange={handleImport}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
        
        {/* PAPERS TAB */}
        {activeTab === 'papers' && (
          <div className={focusedShellClass}>
            {selectedPaper ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                      {selectedPaper.year}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                      {selectedPaper.journal}
                    </div>
                    {selectedPaper.source && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                        {selectedPaper.source === 'demo' ? 'Demo library' : selectedPaper.source === 'crossref' ? 'Crossref metadata' : 'Imported JSON'}
                      </div>
                    )}
                    {typeof selectedPaper.citationCount === 'number' && selectedPaper.citationCount > 0 && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        {selectedPaper.citationCount} citation{selectedPaper.citationCount === 1 ? '' : 's'}
                      </div>
                    )}
                    {selectedPaper.tags?.map(tag => (
                      <div key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {selectedPaper.title}
                      </h2>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {selectedPaper.url && (
                        <a
                          href={selectedPaper.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                          title="Open source record"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Source
                        </a>
                      )}
                      <button
                        onClick={() => generateCitation(selectedPaper)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                        title="Copy Citation"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        Cite
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold">Authors:</span> {selectedPaper.authors?.join(', ') || 'Unknown'}
                  </p>
                  {selectedPaper.doi && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 break-all">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">DOI:</span>{' '}
                      <a
                        href={`https://doi.org/${selectedPaper.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                      >
                        {selectedPaper.doi}
                      </a>
                    </p>
                  )}
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedPaper.summary}</p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <section className="bg-emerald-50/50 dark:bg-emerald-500/5 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Unique Findings
                      </h3>
                      <ul className="space-y-3">
                        {(selectedPaper.uniqueFindings || []).map((finding, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 mt-1.5" />
                            <span className="leading-relaxed">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="bg-amber-50/50 dark:bg-amber-500/5 p-6 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                      <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" />
                        Research Gaps
                      </h3>
                      <ul className="space-y-3">
                        {(selectedPaper.gaps || []).map((gap, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 mt-1.5" />
                            <span className="leading-relaxed">{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className="bg-indigo-50/50 dark:bg-indigo-500/5 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Future Directions
                    </h3>
                    <ul className="space-y-3">
                      {(selectedPaper.futureDirections || []).map((direction, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 mt-1.5" />
                          <span className="leading-relaxed">{direction}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-32">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen className="w-8 h-8 text-indigo-300 dark:text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Paper Selected</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                  {papers.length === 0
                    ? 'Load the demo library, fetch public papers, or import JSON to explore the showcase.'
                    : 'Select a paper from the sidebar to view its summary, gaps, and future directions.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* METADATA TAB */}
        {activeTab === 'metadata' && (
          <div className={wideShellClass}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-6">Metadata & Statistics</h2>
              
              {papers.length > 0 ? (
                <>
                  <div className="mb-10 h-64">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Papers per Year</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="year" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <YAxis allowDecimals={false} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                          itemStyle={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }}
                        />
                        <Bar dataKey="count" fill={isDarkMode ? '#6366f1' : '#4f46e5'} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-medium">Title</th>
                          <th className="px-4 py-3 font-medium">Authors</th>
                          <th className="px-4 py-3 font-medium">Journal</th>
                          <th className="px-4 py-3 font-medium">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {papers.map(paper => (
                          <tr key={paper.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200 max-w-xs truncate" title={paper.title}>{paper.title}</td>
                            <td className="px-4 py-3 max-w-xs truncate" title={paper.authors?.join(', ')}>{paper.authors?.join(', ') || '-'}</td>
                            <td className="px-4 py-3 max-w-xs truncate" title={paper.journal}>{paper.journal || '-'}</td>
                            <td className="px-4 py-3">{paper.year}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-10">No papers available to show metadata.</p>
              )}
            </div>
          </div>
        )}

        {/* GAPS TAB */}
        {activeTab === 'gaps' && (
          <div className={wideShellClass}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">Research Gaps Dashboard</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">A consolidated view of all identified research gaps across your library.</p>
              
              {allGaps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allGaps.map((item, idx) => (
                    <div key={idx} className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 p-5 rounded-xl flex flex-col">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-4 flex-1">
                        "{item.gap}"
                      </p>
                      <div className="mt-auto pt-4 border-t border-amber-200/50 dark:border-amber-500/20 flex justify-between items-center">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-500 truncate max-w-[80%]" title={item.paperTitle}>
                          {item.paperTitle}
                        </span>
                        <span className="text-xs text-amber-600/70 dark:text-amber-500/70 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {item.year}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-10">No gaps identified yet. Add some papers first.</p>
              )}
            </div>
          </div>
        )}

        {/* SYNTHESIS TAB */}
        {activeTab === 'synthesis' && (
          <div className={focusedShellClass}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 min-h-[600px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Domain Synthesis</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Showcase overview of {papers.length} papers in your current library</p>
                </div>
                <button
                  onClick={handleSynthesize}
                  disabled={isSynthesizing || papers.length === 0}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Synthesis
                    </>
                  )}
                </button>
              </div>

              {isSynthesizing ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p>Reviewing {papers.length} papers to identify recurring themes and gaps...</p>
                </div>
              ) : synthesisResult ? (
                <div className="markdown-body">
                  <Markdown>{synthesisResult}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                    <BrainCircuit className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Ready to Synthesize</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Generate a showcase synthesis from the summaries, tags, gaps, and notes already stored in your library.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className={cn(focusedShellClass, 'min-h-[72vh] md:h-full flex flex-col')}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col min-h-[72vh] md:h-[calc(100vh-6rem)]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Chat with your Library</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Ask questions across {papers.length} papers using the stored showcase metadata.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
                    <p>{papers.length === 0 ? 'Load the demo library or add public papers to start exploring.' : 'Ask anything about the papers in your library.'}</p>
                    <p className="text-sm mt-2">
                      {papers.length === 0
                        ? 'This demo answers from the metadata, summaries, tags, and gaps stored in the app.'
                        : 'For example: "What common limitations appear across these studies?"'}
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                          <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      <div className={cn(
                        "px-4 py-3 rounded-2xl max-w-[80%]",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-sm" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm markdown-body text-sm"
                      )}>
                        {msg.role === 'user' ? msg.content : <Markdown>{msg.content}</Markdown>}
                      </div>
                    </div>
                  ))
                )}
                {isChatting && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={papers.length === 0 ? "Load the demo library, fetch public papers, or import JSON first..." : "Ask a question..."}
                    disabled={papers.length === 0 || isChatting}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || papers.length === 0 || isChatting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* GRAPH TAB */}
        {activeTab === 'graph' && (
          <div className={cn(wideShellClass, 'h-full flex flex-col')}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex-1 flex flex-col min-h-[600px]">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">Knowledge Graph</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Visual connections between papers based on shared tags.</p>
              
              <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
                {papers.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    Load the demo library or fetch public papers to build the graph.
                  </div>
                ) : (
                  <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor={node => node.group === 'paper' ? (isDarkMode ? '#818cf8' : '#4f46e5') : (isDarkMode ? '#34d399' : '#10b981')}
                    nodeVal={node => node.val}
                    linkColor={() => isDarkMode ? '#334155' : '#e2e8f0'}
                    backgroundColor={isDarkMode ? '#020617' : '#f8fafc'}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
