// frontend/app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  Search, 
  Database, 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  CheckCircle,
  Network,
  ListCollapse,
  Play,
  Pause,
  RotateCcw,
  X
} from 'lucide-react';

const DEMO_STEPS = [
  {
    phase: 'input',
    badge: 'Preparing',
    statusText: 'User entering prompt...',
    inputText: 'Compare CRISPR-Cas9 vs Prime Editing for precision gene correction.',
    logs: [],
    duration: 3000,
  },
  {
    phase: 'memory',
    badge: 'Memory',
    statusText: 'Querying local memory & vector DB...',
    inputText: 'Compare CRISPR-Cas9 vs Prime Editing for precision gene correction.',
    logs: [
      'Initializing Multi-Agent system graph...',
      'Memory Agent activated.',
      'Checking localized SQLite database...',
      'Running local embedding match for "CRISPR-Cas9 vs Prime Editing"...',
      'Memory match found: 2 documents indexed in sqlite_fallback.',
    ],
    duration: 3500,
  },
  {
    phase: 'research',
    badge: 'Research',
    statusText: 'Crawling academic databases & web sources...',
    inputText: 'Compare CRISPR-Cas9 vs Prime Editing for precision gene correction.',
    logs: [
      'Research Agent activated.',
      'Executing Google Web Search pipeline...',
      'Found 12 matching research citations.',
      'Crawling source: nature.com/articles/s41587-023-018...',
      'Crawling source: biorxiv.org/content/10.1101/2024.01...',
      'Extracting and chunking HTML text data...',
      'Computing semantic similarity vectors...',
    ],
    duration: 5000,
  },
  {
    phase: 'citation',
    badge: 'Citation',
    statusText: 'Fact-checking claims and matching citations...',
    inputText: 'Compare CRISPR-Cas9 vs Prime Editing for precision gene correction.',
    logs: [
      'Citation Agent activated.',
      'Cross-referencing report statements with crawled chunks...',
      'Asserting: "Prime editing does not cause double-strand breaks" -> Matched nature.com [1]',
      'Asserting: "CRISPR-Cas9 has higher raw indels" -> Matched bioRxiv [2]',
      'Citation verification score: 98% (High confidence).',
    ],
    duration: 3000,
  },
  {
    phase: 'synthesis',
    badge: 'Synthesis',
    statusText: 'Generating final synthesis report...',
    inputText: 'Compare CRISPR-Cas9 vs Prime Editing for precision gene correction.',
    logs: [
      'Synthesis Agent activated.',
      'Compiling structured Markdown format...',
      'Attaching verified citation links...',
      'Report generation finalized.',
    ],
    markdownContent: `### Research Report: Prime Editing vs. CRISPR-Cas9

**1. Efficacy & Precision**
* **CRISPR-Cas9**: Highly efficient for gene disruption via double-strand breaks (DSBs), but susceptible to off-target insertions/deletions (indels) [1].
* **Prime Editing**: Enables precise search-and-replace edits (transmissions, transversions, small insertions/deletions) *without* double-strand breaks, reducing off-target risks [2].

**2. Delivery & Size**
* **Prime Editors** (~6.3 kb) are larger than standard **Cas9** (~4.1 kb), presenting greater packaging constraints for viral vectors [3].

**Sources**:
[1] nature.com/articles/s41587-023-018 (96% conf)
[2] biorxiv.org/content/10.1101/2024.01 (94% conf)
`,
    duration: 7000,
  }
];

export default function Home() {
  const [demoState, setDemoState] = useState<'idle' | 'playing' | 'paused' | 'completed'>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [typedMarkdown, setTypedMarkdown] = useState('');
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [logIndex, setLogIndex] = useState(0);

  const demoSectionRef = useRef<HTMLDivElement>(null);

  // Reset or control handlers
  const restartDemo = () => {
    setDemoState('playing');
    setCurrentStepIndex(0);
    setTypedInput('');
    setTypedMarkdown('');
    setVisibleLogs([]);
    setLogIndex(0);
  };

  const stopDemo = () => {
    setDemoState('idle');
    setCurrentStepIndex(0);
    setTypedInput('');
    setTypedMarkdown('');
    setVisibleLogs([]);
    setLogIndex(0);
  };

  const startDemoAndScroll = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    setDemoState('playing');
    setCurrentStepIndex(0);
    setTypedInput('');
    setTypedMarkdown('');
    setVisibleLogs([]);
    setLogIndex(0);
    
    const element = document.getElementById('demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 1. Typing user prompt
  useEffect(() => {
    if (demoState !== 'playing') return;

    if (currentStepIndex === 0) {
      const fullText = DEMO_STEPS[0].inputText;
      if (typedInput.length < fullText.length) {
        const timeout = setTimeout(() => {
          setTypedInput(fullText.substring(0, typedInput.length + 1));
        }, 30 / speed);
        return () => clearTimeout(timeout);
      } else {
        // Typing done, move to Memory agent
        const timeout = setTimeout(() => {
          setCurrentStepIndex(1);
          setLogIndex(0);
        }, 1000 / speed);
        return () => clearTimeout(timeout);
      }
    }
  }, [demoState, currentStepIndex, typedInput, speed]);

  // 2. Printing logs step-by-step
  useEffect(() => {
    if (demoState !== 'playing') return;
    if (currentStepIndex === 0) return;
    if (currentStepIndex >= DEMO_STEPS.length) {
      setDemoState('completed');
      return;
    }

    const step = DEMO_STEPS[currentStepIndex];
    if (logIndex < step.logs.length) {
      const timeout = setTimeout(() => {
        setVisibleLogs(prev => [...prev, step.logs[logIndex]]);
        setLogIndex(prev => prev + 1);
      }, 700 / speed);
      return () => clearTimeout(timeout);
    } else {
      if (step.phase !== 'synthesis') {
        const timeout = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
          setLogIndex(0);
        }, 1200 / speed);
        return () => clearTimeout(timeout);
      }
    }
  }, [demoState, currentStepIndex, logIndex, speed]);

  // 3. Typing final report markdown
  useEffect(() => {
    if (demoState !== 'playing') return;
    if (currentStepIndex !== 4) return;

    const step = DEMO_STEPS[4];
    const fullMarkdown = step.markdownContent || '';

    if (typedMarkdown.length < fullMarkdown.length) {
      const timeout = setTimeout(() => {
        const nextLength = Math.min(typedMarkdown.length + 6, fullMarkdown.length);
        setTypedMarkdown(fullMarkdown.substring(0, nextLength));
      }, 25 / speed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setDemoState('completed');
      }, 1500 / speed);
      return () => clearTimeout(timeout);
    }
  }, [demoState, currentStepIndex, typedMarkdown, speed]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans overflow-hidden">
      
      {/* Background ambient glowing blooms */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-purple-900/10 via-transparent to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600/15 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="text-base font-bold text-white tracking-tight">Research Workspace</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#demo" onClick={startDemoAndScroll} className="hover:text-white transition-colors">Product Demo</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-purple-600/10 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/20 border border-purple-500/20 text-purple-300 text-xs font-medium animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by LangGraph & Gemini API</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
          The Command Center for <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400">
            Deep Scientific Research
          </span>
        </h1>

        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
          An orchestrator mapping real-time web crawler pipelines, localized document semantic vector storage, and automated fact-checking citations to deliver structured markdown analyses.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            href="/signup"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm cursor-pointer shadow-lg shadow-purple-600/10 transition-colors"
          >
            Start Researching
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button 
            onClick={startDemoAndScroll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-6 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* Product Demo Mockup */}
      <section id="demo" ref={demoSectionRef} className="max-w-6xl mx-auto px-6 pb-24 relative z-10">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {/* Glassmorphic Simulation Overlay */}
          {(demoState === 'idle' || demoState === 'completed') && (
            <div className="absolute inset-0 bg-[#050505]/75 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-20 transition-all duration-300 p-6 text-center">
              <button 
                onClick={restartDemo}
                className="w-16 h-16 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-full flex items-center justify-center mb-4 text-purple-400 shadow-xl shadow-purple-600/5 hover:scale-105 transition-all cursor-pointer"
              >
                {demoState === 'idle' ? (
                  <Play className="w-6 h-6 fill-purple-400 ml-1 text-purple-300" />
                ) : (
                  <RotateCcw className="w-6 h-6 text-purple-300" />
                )}
              </button>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                {demoState === 'idle' ? 'Run Agent Swarm Simulation' : 'Simulation Completed!'}
              </h3>
              <p className="text-zinc-400 text-xs max-w-sm mb-6 leading-relaxed">
                {demoState === 'idle' 
                  ? 'Watch our LangGraph swarm coordinate a full research pipeline: memory extraction, real-time web crawling, and report synthesis.'
                  : 'You have seen the simulated swarm complete the research loop. Ready to execute real scientific queries?'}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={restartDemo}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-purple-600/10 hover:shadow-purple-600/25 transition-all"
                >
                  {demoState === 'idle' ? 'Start Simulation' : 'Run Again'}
                </button>
                {demoState === 'completed' && (
                  <Link 
                    href="/signup" 
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold rounded-xl transition-all"
                  >
                    Start Real Research
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-800/80 flex items-center px-4 gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            <span className="text-[10px] text-zinc-600 font-bold uppercase ml-4 tracking-wider">Research Console (Mockup)</span>
          </div>

          <div className="mt-10 grid grid-cols-4 gap-4 h-[400px]">
            {/* Sidebar */}
            <div className="border-r border-zinc-800/50 p-3 space-y-4 hidden md:block col-span-1">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Agent Swarm Graph</div>
              <div className="space-y-2">
                {/* Memory Agent Row */}
                <div className={`p-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                  currentStepIndex === 1 
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                    : currentStepIndex > 1
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                      : 'bg-zinc-900/10 border-transparent text-zinc-600'
                }`}>
                  <Brain className={`w-3.5 h-3.5 ${currentStepIndex === 1 ? 'animate-pulse text-purple-400' : ''}`} />
                  <div className="flex-1 text-[11px] font-medium">Memory Agent</div>
                  {currentStepIndex > 1 && <span className="text-purple-400 text-[10px]">✓</span>}
                  {currentStepIndex === 1 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                </div>

                {/* Research Agent Row */}
                <div className={`p-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                  currentStepIndex === 2 
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                    : currentStepIndex > 2
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                      : 'bg-zinc-900/10 border-transparent text-zinc-600'
                }`}>
                  <Search className={`w-3.5 h-3.5 ${currentStepIndex === 2 ? 'animate-pulse text-purple-400' : ''}`} />
                  <div className="flex-1 text-[11px] font-medium">Research Agent</div>
                  {currentStepIndex > 2 && <span className="text-purple-400 text-[10px]">✓</span>}
                  {currentStepIndex === 2 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                </div>

                {/* Citation Agent Row */}
                <div className={`p-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                  currentStepIndex === 3 
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                    : currentStepIndex > 3
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                      : 'bg-zinc-900/10 border-transparent text-zinc-600'
                }`}>
                  <ShieldAlert className={`w-3.5 h-3.5 ${currentStepIndex === 3 ? 'animate-pulse text-purple-400' : ''}`} />
                  <div className="flex-1 text-[11px] font-medium">Citation Agent</div>
                  {currentStepIndex > 3 && <span className="text-purple-400 text-[10px]">✓</span>}
                  {currentStepIndex === 3 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                </div>

                {/* Synthesis Agent Row */}
                <div className={`p-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                  currentStepIndex === 4 
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                    : currentStepIndex > 4
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                      : 'bg-zinc-900/10 border-transparent text-zinc-600'
                }`}>
                  <FileText className={`w-3.5 h-3.5 ${currentStepIndex === 4 ? 'animate-pulse text-purple-400' : ''}`} />
                  <div className="flex-1 text-[11px] font-medium">Synthesis Agent</div>
                  {currentStepIndex > 4 && <span className="text-purple-400 text-[10px]">✓</span>}
                  {currentStepIndex === 4 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-4 md:col-span-3 flex flex-col justify-between p-2 h-full overflow-hidden">
              
              {/* Pipeline Header */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-xl flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1.5">
                  <Cpu className={`w-3.5 h-3.5 ${demoState === 'playing' ? 'animate-spin' : ''}`} />
                  {demoState === 'playing' ? DEMO_STEPS[currentStepIndex].statusText : 'Simulator Standing By'}
                </span>
                <div className="flex gap-1.5">
                  <span className={`h-4.5 px-2 text-[9px] rounded-md font-semibold flex items-center border transition-all duration-300 ${
                    currentStepIndex === 1 
                      ? 'bg-purple-600/15 border-purple-500/20 text-purple-300' 
                      : currentStepIndex > 1
                        ? 'bg-zinc-900/40 border-zinc-800 text-purple-400/60'
                        : 'bg-zinc-900 text-zinc-500 border-transparent'
                  }`}>Memory</span>
                  <span className={`h-4.5 px-2 text-[9px] rounded-md font-semibold flex items-center border transition-all duration-300 ${
                    currentStepIndex === 2 
                      ? 'bg-purple-600/15 border-purple-500/20 text-purple-300' 
                      : currentStepIndex > 2
                        ? 'bg-zinc-900/40 border-zinc-800 text-purple-400/60'
                        : 'bg-zinc-900 text-zinc-500 border-transparent'
                  }`}>Research</span>
                  <span className={`h-4.5 px-2 text-[9px] rounded-md font-semibold flex items-center border transition-all duration-300 ${
                    currentStepIndex === 3 || currentStepIndex === 4
                      ? 'bg-purple-600/15 border-purple-500/20 text-purple-300' 
                      : currentStepIndex > 4
                        ? 'bg-zinc-900/40 border-zinc-800 text-purple-400/60'
                        : 'bg-zinc-900 text-zinc-500 border-transparent'
                  }`}>Synthesis</span>
                </div>
              </div>

              {/* Chat Content Area (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 max-h-[240px]">
                {/* User Prompt Message */}
                {typedInput && (
                  <div className="flex gap-3 items-start justify-end">
                    <div className="bg-purple-950/20 border border-purple-500/20 px-3 py-2 rounded-xl rounded-tr-none max-w-xl text-[11px] leading-relaxed text-purple-200">
                      {typedInput}
                    </div>
                    <div className="w-6.5 h-6.5 bg-purple-600/20 border border-purple-500/20 text-[9px] font-bold text-purple-400 rounded-lg flex items-center justify-center">U</div>
                  </div>
                )}

                {/* Execution Log Terminal */}
                {visibleLogs.length > 0 && (
                  <div className="bg-black/70 border border-zinc-900 rounded-xl p-2.5 font-mono text-[9px] text-zinc-400 space-y-1 shadow-inner">
                    <div className="text-[8px] uppercase tracking-wider text-purple-400 font-bold mb-1 border-b border-zinc-900/60 pb-1 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-purple-500 animate-ping" />
                      Agent Swarm Logs
                    </div>
                    <div className="space-y-0.5 max-h-[90px] overflow-y-auto">
                      {visibleLogs.map((log, index) => (
                        <div key={index} className="flex gap-1.5 leading-relaxed">
                          <span className="text-purple-500/60 select-none">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Answer Message */}
                {typedMarkdown && (
                  <div className="flex gap-3 items-start">
                    <div className="w-6.5 h-6.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg flex items-center justify-center">A</div>
                    <div className="bg-zinc-950/40 border border-zinc-900 px-3 py-2 rounded-xl rounded-tl-none max-w-xl text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {typedMarkdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Placeholder block at bottom */}
              <div className="h-10 w-full bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between px-3 text-[11px] text-zinc-500 mt-2">
                <span>
                  {demoState === 'idle' 
                    ? "Click 'Watch Demo' to simulate..." 
                    : demoState === 'playing' && currentStepIndex === 0
                      ? "Typing prompt..."
                      : "Multi-Agent loop active..."
                  }
                </span>
                <span className="py-1 px-2.5 bg-purple-600/20 text-purple-400 text-[9px] font-bold rounded-lg uppercase">
                  {demoState === 'playing' ? "Running" : "Idle"}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        {(demoState === 'playing' || demoState === 'paused') && (
          <div className="mt-4 flex items-center justify-between bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-2.5 backdrop-blur-md max-w-2xl mx-auto z-10 relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDemoState(demoState === 'playing' ? 'paused' : 'playing')}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={demoState === 'playing' ? 'Pause' : 'Play'}
              >
                {demoState === 'playing' ? (
                  <Pause className="w-4 h-4 text-purple-400" />
                ) : (
                  <Play className="w-4 h-4 fill-purple-400 text-purple-400" />
                )}
              </button>
              <button 
                onClick={restartDemo}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4 text-purple-400" />
              </button>
              <button 
                onClick={stopDemo}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Stop/Reset"
              >
                <X className="w-4 h-4 text-purple-400" />
              </button>
            </div>

            {/* Progress dots/timeline */}
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-medium text-zinc-500">
              <span className={`transition-colors duration-300 ${currentStepIndex >= 0 ? 'text-purple-400' : ''}`}>Input</span>
              <span className="text-zinc-800">→</span>
              <span className={`transition-colors duration-300 ${currentStepIndex >= 1 ? 'text-purple-400' : ''}`}>Memory</span>
              <span className="text-zinc-800">→</span>
              <span className={`transition-colors duration-300 ${currentStepIndex >= 2 ? 'text-purple-400' : ''}`}>Research</span>
              <span className="text-zinc-800">→</span>
              <span className={`transition-colors duration-300 ${currentStepIndex >= 3 ? 'text-purple-400' : ''}`}>Citation</span>
              <span className="text-zinc-800">→</span>
              <span className={`transition-colors duration-300 ${currentStepIndex >= 4 ? 'text-purple-400' : ''}`}>Synthesis</span>
            </div>

            {/* Speed Controller */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSpeed(1)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                  speed === 1 
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                1x
              </button>
              <button 
                onClick={() => setSpeed(2)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                  speed === 2 
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                2x
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Feature Matrix */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 border-t border-zinc-900 space-y-12 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Full-Stack Synthesis Engine</h2>
          <p className="text-zinc-500 text-sm">
            Everything you need to orchestrate agent workflows and inspect factual claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-zinc-900 bg-zinc-950/20 hover:border-zinc-850 p-6 rounded-2xl space-y-4 transition-all">
            <div className="p-3 bg-purple-600/10 text-purple-400 border border-purple-500/10 rounded-xl w-fit">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">LangGraph Multi-Agent</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Splits research tasks among Memory, Research, Citation, and Report agents executing in series with real-time status notifications.
            </p>
          </div>

          <div className="border border-zinc-900 bg-zinc-950/20 hover:border-zinc-850 p-6 rounded-2xl space-y-4 transition-all">
            <div className="p-3 bg-purple-600/10 text-purple-400 border border-purple-500/10 rounded-xl w-fit">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Dual-Mode Vector DB</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Automatically runs PostgreSQL with pgvector for production deployments, and transparently falls back to local SQLite + in-memory cosine vectors.
            </p>
          </div>

          <div className="border border-zinc-900 bg-zinc-950/20 hover:border-zinc-850 p-6 rounded-2xl space-y-4 transition-all">
            <div className="p-3 bg-purple-600/10 text-purple-400 border border-purple-500/10 rounded-xl w-fit">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Verified Citations</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Maintains factual integrity. Every assertion maps to document highlights or web links with confidence and source scoring.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Matrix */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-24 border-t border-zinc-900 space-y-12 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Flexible Pricing Plan</h2>
          <p className="text-zinc-500 text-sm">
            Deploy for free on your local environment or scale to the cloud.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free Tier */}
          <div className="border border-zinc-900 bg-zinc-950/15 p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-zinc-400">Local Developer</h4>
              <p className="text-zinc-500 text-xs">Self-hosted environment.</p>
              <div className="pt-2">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-zinc-600 text-xs"> / forever</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> SQLite fallback database</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> Local vector similarity index</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> Unlimited simulated agent runs</li>
            </ul>
            <Link 
              href="/signup" 
              className="py-2.5 text-center text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Cloud Tier */}
          <div className="border border-purple-500/25 bg-purple-950/5 p-6 rounded-2xl flex flex-col justify-between space-y-6 ring-2 ring-purple-600/5 relative">
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-purple-600 text-white rounded-full text-[9px] font-bold uppercase tracking-wider">Popular</div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-purple-400">Enterprise Cloud</h4>
              <p className="text-zinc-500 text-xs">Managed infrastructure.</p>
              <div className="pt-2">
                <span className="text-3xl font-bold text-white">$29</span>
                <span className="text-zinc-600 text-xs"> / user / month</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> Production pgvector + Redis cache</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> Full Gemini-1.5-Flash live runs</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500" /> Multi-user shared workspaces</li>
            </ul>
            <Link 
              href="/signup" 
              className="py-2.5 text-center text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/10 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-zinc-900 py-12 text-center text-xs text-zinc-600 relative z-10 max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} Research Workspace Inc. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-zinc-400 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-zinc-400 transition-colors">Pricing</a>
        </div>
      </footer>
      
    </div>
  );
}
