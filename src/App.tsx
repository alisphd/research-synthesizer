import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, BrainCircuit, Trash2, Loader2, ChevronRight, BookOpen, Sparkles, Moon, Sun, Menu, X, Download, UploadCloud, Database, Target, MessageSquare, Network, Search, Tag, Quote, Send, LogIn, LogOut } from 'lucide-react';
import Markdown from 'react-markdown';
import { PaperAnalysis } from './types';
import { analyzePaper, synthesizeDomain, chatWithLibrary } from './services/gemini';
import { clearStoredFirebaseConfig, describeFirebaseConfig, formatFirebaseConfig, getStoredFirebaseConfig, parseFirebaseConfig, saveFirebaseConfig, type FirebaseRuntimeConfig } from './lib/firebaseConfig';
import { clearGeminiApiKey, getStoredGeminiApiKey, maskGeminiApiKey, saveGeminiApiKey } from './lib/geminiKey';
import { cn } from './lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import { getFirebaseServices, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';

function loadInitialFirebaseConfig() {
  return getStoredFirebaseConfig();
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseRuntimeConfig | null>(loadInitialFirebaseConfig);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    const storedFirebaseConfig = loadInitialFirebaseConfig();
    return storedFirebaseConfig ? formatFirebaseConfig(storedFirebaseConfig) : '';
  });
  const [isEditingFirebaseConfig, setIsEditingFirebaseConfig] = useState(() => !loadInitialFirebaseConfig());
  
  const [papers, setPapers] = useState<PaperAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<'papers' | 'metadata' | 'gaps' | 'synthesis' | 'chat' | 'graph'>('papers');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredGeminiApiKey());
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [isEditingGeminiKey, setIsEditingGeminiKey] = useState(() => !getStoredGeminiApiKey());
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const firebaseServices = useMemo(() => getFirebaseServices(firebaseConfig), [firebaseConfig]);
  const auth = firebaseServices?.auth ?? null;
  const db = firebaseServices?.db ?? null;

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setPapers([]);
      setIsAuthReady(true);
      return;
    }

    setIsAuthReady(false);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setPapers([]);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!isAuthReady || !user || !db) return;

    const q = query(collection(db, `users/${user.uid}/papers`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPapers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaperAnalysis[];
      setPapers(loadedPapers);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [db, user, isAuthReady]);

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

  const hasGeminiApiKey = geminiApiKey.trim().length > 0;
  const hasFirebaseConfig = firebaseConfig !== null;

  const ensureFirebaseConfig = () => {
    if (hasFirebaseConfig) {
      return true;
    }

    setIsEditingFirebaseConfig(true);
    alert('Add your Firebase web config JSON to enable Google sign-in and cloud sync. It is stored only in this browser.');
    return false;
  };

  const handleSaveFirebaseConfig = () => {
    try {
      const parsedConfig = parseFirebaseConfig(firebaseConfigInput);
      saveFirebaseConfig(parsedConfig);
      setFirebaseConfig(parsedConfig);
      setFirebaseConfigInput(formatFirebaseConfig(parsedConfig));
      setIsEditingFirebaseConfig(false);
    } catch (error) {
      console.error('Invalid Firebase config:', error);
      alert('Invalid Firebase config JSON. Paste the Firebase web config plus firestoreDatabaseId.');
    }
  };

  const handleClearFirebaseConfig = async () => {
    try {
      await logout(firebaseConfig);
    } catch (error) {
      console.error('Error signing out while clearing Firebase config', error);
    }

    clearStoredFirebaseConfig();
    setFirebaseConfig(null);
    setFirebaseConfigInput('');
    setIsEditingFirebaseConfig(true);
    setUser(null);
    setPapers([]);
  };

  const handleSignIn = async () => {
    if (!ensureFirebaseConfig()) {
      return;
    }

    try {
      await signInWithGoogle(firebaseConfig);
    } catch (error) {
      console.error('Error signing in with Google', error);
      alert('Google sign-in failed. Check your Firebase config and authorized domains.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout(firebaseConfig);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const ensureGeminiApiKey = () => {
    if (hasGeminiApiKey) {
      return true;
    }

    setIsEditingGeminiKey(true);
    alert('Add your Gemini API key to use paper analysis, chat, and synthesis. It is stored only in this browser.');
    return false;
  };

  const handleSaveGeminiKey = () => {
    const trimmedApiKey = geminiApiKeyInput.trim();

    if (!trimmedApiKey) {
      alert('Enter a Gemini API key before saving.');
      return;
    }

    saveGeminiApiKey(trimmedApiKey);
    setGeminiApiKey(trimmedApiKey);
    setGeminiApiKeyInput(trimmedApiKey);
    setIsEditingGeminiKey(false);
  };

  const handleClearGeminiKey = () => {
    clearGeminiApiKey();
    setGeminiApiKey('');
    setGeminiApiKeyInput('');
    setIsEditingGeminiKey(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ensureGeminiApiKey()) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const analysis = await analyzePaper(geminiApiKey, base64, file.type);
          
          const newPaper: PaperAnalysis = {
            id: Math.random().toString(36).substring(2, 15),
            ...analysis,
          };
          
          if (user && db) {
            try {
              await setDoc(doc(db, `users/${user.uid}/papers`, newPaper.id), {
                ...newPaper,
                createdAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Error saving to Firestore:", err);
            }
          } else {
            setPapers(prev => [newPaper, ...prev]);
          }
          
          setSelectedPaperId(newPaper.id);
          setActiveTab('papers');
        } catch (error) {
          console.error("Error analyzing paper:", error);
          alert("Failed to analyze paper. See console for details.");
        } finally {
          setIsAnalyzing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setIsAnalyzing(false);
    }
  };

  const handleSynthesize = async () => {
    if (papers.length === 0) return;
    if (!ensureGeminiApiKey()) return;
    setIsSynthesizing(true);
    setActiveTab('synthesis');
    try {
      const result = await synthesizeDomain(geminiApiKey, papers);
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
    
    if (user && db) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/papers`, id));
      } catch (err) {
        console.error("Error deleting from Firestore:", err);
      }
    } else {
      setPapers(prev => prev.filter(p => p.id !== id));
    }

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
        const importedPapers = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedPapers)) {
          if (user && db) {
            importedPapers.forEach(async (p) => {
              try {
                await setDoc(doc(db, `users/${user.uid}/papers`, p.id), {
                  ...p,
                  createdAt: serverTimestamp()
                });
              } catch (err) {
                console.error("Error importing to Firestore:", err);
              }
            });
          } else {
            setPapers(importedPapers);
          }
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
    if (!ensureGeminiApiKey()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const response = await chatWithLibrary(geminiApiKey, papers, userMsg);
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
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
        "fixed md:static inset-y-0 left-0 w-80 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl md:shadow-none z-40 transition-transform duration-300 ease-in-out md:translate-x-0",
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

        {/* User Profile / Auth */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {hasFirebaseConfig ? 'Sign in to sync papers' : 'Add Firebase config to sync papers'}
            </div>
          )}
          
          {user ? (
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSignIn} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-sm font-medium transition-colors">
              <LogIn className="w-4 h-4" />
              {hasFirebaseConfig ? 'Sign In' : 'Set Up'}
            </button>
          )}
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

              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
                Added Papers ({filteredPapers.length})
              </div>
              {filteredPapers.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  {papers.length === 0 ? "No papers added yet. Upload a PDF to begin." : "No papers match your search."}
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
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Firebase config</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {firebaseConfig
                    ? `Cloud sync ready for ${describeFirebaseConfig(firebaseConfig)}. Stored only in this browser.`
                    : 'Paste your Firebase web config JSON to enable Google sign-in and cloud sync. Stored only in this browser.'}
                </p>
              </div>
              {!isEditingFirebaseConfig && (
                <button
                  onClick={() => setIsEditingFirebaseConfig(true)}
                  className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingFirebaseConfig ? (
              <div className="space-y-2">
                <textarea
                  value={firebaseConfigInput}
                  onChange={(e) => setFirebaseConfigInput(e.target.value)}
                  placeholder={`{\n  "projectId": "...",\n  "appId": "...",\n  "apiKey": "...",\n  "authDomain": "...",\n  "firestoreDatabaseId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "..."\n}`}
                  className="w-full min-h-32 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFirebaseConfig}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Save config
                  </button>
                  {hasFirebaseConfig && (
                    <button
                      onClick={() => {
                        setFirebaseConfigInput(firebaseConfig ? formatFirebaseConfig(firebaseConfig) : '');
                        setIsEditingFirebaseConfig(false);
                      }}
                      className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearFirebaseConfig}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Clear saved config
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gemini API key</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {hasGeminiApiKey
                    ? `Key ${maskGeminiApiKey(geminiApiKey)}. Stored only in this browser.`
                    : 'Required for paper analysis, synthesis, and chat. Stored only in this browser.'}
                </p>
              </div>
              {!isEditingGeminiKey && (
                <button
                  onClick={() => setIsEditingGeminiKey(true)}
                  className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingGeminiKey ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveGeminiKey}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Save key
                  </button>
                  {hasGeminiApiKey && (
                    <button
                      onClick={() => {
                        setGeminiApiKeyInput(geminiApiKey);
                        setIsEditingGeminiKey(false);
                      }}
                      className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearGeminiKey}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Clear saved key
              </button>
            )}
          </div>

          <input
            type="file"
            accept="application/pdf, text/plain"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => {
              if (!ensureGeminiApiKey()) return;
              fileInputRef.current?.click();
            }}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Paper
              </>
            )}
          </button>
          
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
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
        
        {/* PAPERS TAB */}
        {activeTab === 'papers' && (
          <div className="max-w-4xl mx-auto p-4 pt-20 md:p-8">
            {selectedPaper ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                      {selectedPaper.year}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                      {selectedPaper.journal}
                    </div>
                    {selectedPaper.tags?.map(tag => (
                      <div key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4">
                      {selectedPaper.title}
                    </h2>
                    <button
                      onClick={() => generateCitation(selectedPaper)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                      title="Copy Citation"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      Cite
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Authors:</span> {selectedPaper.authors?.join(', ') || 'Unknown'}
                  </p>
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
                  Select a paper from the sidebar to view its extracted findings, gaps, and future directions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* METADATA TAB */}
        {activeTab === 'metadata' && (
          <div className="max-w-6xl mx-auto p-4 pt-20 md:p-8">
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
          <div className="max-w-6xl mx-auto p-4 pt-20 md:p-8">
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
          <div className="max-w-4xl mx-auto p-4 pt-20 md:p-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 min-h-[600px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Domain Synthesis</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Meta-analysis of {papers.length} accumulated papers</p>
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
                  <p>Analyzing {papers.length} papers to find cross-cutting themes...</p>
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
                    Click "Generate Synthesis" to have AI analyze all your accumulated papers, identify common gaps, and map out the future trajectory of this domain.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto p-4 pt-20 md:p-8 h-full flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-8rem)]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Chat with your Library</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Ask questions across {papers.length} accumulated papers.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
                    <p>Ask anything about the papers in your library.</p>
                    <p className="text-sm mt-2">e.g., "What are the common limitations mentioned across these studies?"</p>
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
                    placeholder={!hasGeminiApiKey ? "Add your Gemini API key to start chatting..." : papers.length === 0 ? "Upload papers to start chatting..." : "Ask a question..."}
                    disabled={!hasGeminiApiKey || papers.length === 0 || isChatting}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!hasGeminiApiKey || !chatInput.trim() || papers.length === 0 || isChatting}
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
          <div className="max-w-6xl mx-auto p-4 pt-20 md:p-8 h-full flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex-1 flex flex-col min-h-[600px]">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">Knowledge Graph</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Visual connections between papers based on shared tags.</p>
              
              <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
                {papers.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    No data to display. Upload papers to build the graph.
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
