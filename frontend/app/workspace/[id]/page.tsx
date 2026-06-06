// frontend/app/workspace/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { 
  chatApi, 
  workspaceApi, 
  documentApi, 
  noteApi, 
  reportApi,
  WorkspaceType, 
  ChatType, 
  MessageType, 
  UploadedFileType, 
  NoteType, 
  ReportType 
} from '../../../lib/api';
import Link from 'next/link';
import { 
  Folder, 
  MessageSquare, 
  Plus, 
  Send, 
  UploadCloud, 
  FileText, 
  BookOpen, 
  Paperclip, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Brain, 
  Network, 
  ChevronRight, 
  ExternalLink,
  ChevronDown,
  Trash2,
  FileCode,
  Download
} from 'lucide-react';

export default function WorkspacePage() {
  const { id: workspaceId } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Core State
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [files, setFiles] = useState<UploadedFileType[]>([]);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [reports, setReports] = useState<ReportType[]>([]);

  // UI State
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'files' | 'citations' | 'reports'>('files');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  // Active Agent Tracking
  const [agentPipeline, setAgentPipeline] = useState<Record<string, { status: 'idle' | 'running' | 'completed'; message?: string }>>({
    'Memory Agent': { status: 'idle' },
    'Research Agent': { status: 'idle' },
    'Summarization Agent': { status: 'idle' },
    'Citation Agent': { status: 'idle' },
    'Report Agent': { status: 'idle' }
  });
  const [activePipelineAgent, setActivePipelineAgent] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // File Upload State
  const [uploading, setUploading] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Workspace Data
  useEffect(() => {
    if (!user) return;

    const initWorkspace = async () => {
      try {
        setLoadingWorkspace(true);
        // List all workspaces
        const wsList = await workspaceApi.list();
        setWorkspaces(wsList);
        const wsObj = wsList.find(w => w.id === workspaceId) || null;
        setCurrentWorkspace(wsObj);

        // Fetch chats, files, notes, reports
        const chatList = await chatApi.list(workspaceId);
        setChats(chatList);
        if (chatList.length > 0) {
          setCurrentChatId(chatList[0].id);
        } else {
          try {
            const defaultChat = await chatApi.create("Research Session", workspaceId);
            setChats([defaultChat]);
            setCurrentChatId(defaultChat.id);
          } catch (createErr) {
            console.error('Failed to create default chat:', createErr);
          }
        }

        const fileList = await documentApi.list(workspaceId);
        setFiles(fileList);

        const noteList = await noteApi.list(workspaceId);
        setNotes(noteList);

        const reportList = await reportApi.list(workspaceId);
        setReports(reportList);
      } catch (err) {
        console.error('Error loading workspace context:', err);
      } finally {
        setLoadingWorkspace(false);
      }
    };

    initWorkspace();
  }, [workspaceId, user]);

  // Load Chat Messages & Connect WebSocket
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }

    // Load static history first
    const loadMessages = async () => {
      try {
        const msgs = await chatApi.getMessages(currentChatId);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadMessages();

    // Close existing socket
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect new WebSocket
    const wsUrl = chatApi.getWebSocketUrl(currentChatId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Chat WebSocket connected:', currentChatId);
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      console.log('WS Message received:', payload);

      if (payload.type === 'agent_state') {
        const { agent, status, message } = payload;
        setAgentPipeline(prev => ({
          ...prev,
          [agent]: { status, message }
        }));
        if (status === 'running') {
          setActivePipelineAgent(agent);
        } else if (status === 'completed' && activePipelineAgent === agent) {
          setActivePipelineAgent(null);
        }
      } else if (payload.type === 'message') {
        const msg = payload.message;
        setMessages(prev => {
          // Check if message already exists (e.g. user self-message confirmation)
          const exists = prev.some(m => m.id === msg.id);
          if (exists) {
            return prev.map(m => m.id === msg.id ? { ...m, ...msg } : m);
          }
          return [...prev, msg];
        });

        // If report is returned at the end, add to workspace reports list
        if (payload.report) {
          setReports(prev => [payload.report, ...prev]);
          setSelectedReport(payload.report);
          setRightPanelTab('reports');
        }

        // Reset Pipeline representation on final assistant payload
        if (msg.sender === 'assistant') {
          setAgentPipeline({
            'Memory Agent': { status: 'idle' },
            'Research Agent': { status: 'idle' },
            'Summarization Agent': { status: 'idle' },
            'Citation Agent': { status: 'idle' },
            'Report Agent': { status: 'idle' }
          });
          setActivePipelineAgent(null);
        }
      } else if (payload.type === 'error') {
        console.error('WS Payload Error:', payload.message);
        alert(`Agent Error: ${payload.message}`);
      }
    };

    ws.onclose = () => {
      console.log('Chat WebSocket disconnected:', currentChatId);
      setWsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket encountered error:', err);
      setWsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentChatId, reconnectTrigger]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePipelineAgent]);

  // Handlers
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send query payload
    wsRef.current.send(JSON.stringify({ content: inputMessage }));
    setInputMessage('');

    // Reset pipeline nodes to pending/running state
    setAgentPipeline({
      'Memory Agent': { status: 'idle' },
      'Research Agent': { status: 'idle' },
      'Summarization Agent': { status: 'idle' },
      'Citation Agent': { status: 'idle' },
      'Report Agent': { status: 'idle' }
    });
  };

  const handleCreateChat = async () => {
    const title = prompt('Enter research topic or chat title:');
    if (!title || !title.trim()) return;

    try {
      const created = await chatApi.create(title, workspaceId);
      setChats(prev => [created, ...prev]);
      setCurrentChatId(created.id);
    } catch (err) {
      alert('Failed to start chat session');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await documentApi.upload(workspaceId, file);
      setFiles(prev => [uploaded, ...prev]);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await documentApi.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  // Render Helpers
  const renderAgentStatusNode = (name: string, index: number) => {
    const node = agentPipeline[name];
    let icon = <Brain className="w-4 h-4" />;
    let stateColor = 'border-zinc-800 text-zinc-500 bg-zinc-950/20';

    if (node.status === 'running') {
      stateColor = 'border-purple-500 text-purple-400 bg-purple-950/20 animate-pulse ring-2 ring-purple-600/20';
      icon = <Loader2 className="w-4 h-4 animate-spin" />;
    } else if (node.status === 'completed') {
      stateColor = 'border-emerald-500 text-emerald-400 bg-emerald-950/20';
      icon = <CheckCircle2 className="w-4 h-4" />;
    }

    return (
      <div className="flex items-center gap-2" key={name}>
        {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-700 hidden sm:inline" />}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${stateColor} transition-all`}>
          {icon}
          <span>{name}</span>
        </div>
      </div>
    );
  };

  if (authLoading || loadingWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm font-medium tracking-wide">Assembling workspace agent nodes...</span>
        </div>
      </div>
    );
  }

  // Get active citations across current messages
  const allCitations = messages
    .filter(m => m.sender === 'assistant' && m.citations)
    .flatMap(m => m.citations || []);

  const handleDownloadReport = () => {
    if (!selectedReport) return;
    const blob = new Blob([selectedReport.markdown_content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = selectedReport.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '');
    link.setAttribute('download', `${sanitizedTitle || 'research_report'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderMarkdownContent = (markdownText: string) => {
    if (!markdownText) return null;
    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const parseInlineStyles = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('[') && part.includes('](')) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            return (
              <a
                key={idx}
                href={match[2]}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-0.5 animate-pulse"
              >
                {match[1]}
                <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            );
          }
        }
        return part;
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('* ') || line.startsWith('- ')) {
        inList = true;
        listItems.push(
          <li key={`li-${i}`} className="mb-1 text-zinc-350 leading-relaxed font-light text-xs sm:text-sm">
            {parseInlineStyles(line.substring(2))}
          </li>
        );
        continue;
      }

      if (inList && !line.startsWith('* ') && !line.startsWith('- ')) {
        elements.push(
          <ul key={`ul-${i}`} className="list-disc pl-5 my-3 space-y-1">
            {listItems}
          </ul>
        );
        inList = false;
        listItems = [];
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-bold text-white mt-6 mb-4 border-b border-zinc-800/80 pb-2">
            {parseInlineStyles(line.substring(2))}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-base sm:text-lg font-bold text-purple-400 mt-5 mb-3">
            {parseInlineStyles(line.substring(3))}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-sm sm:text-base font-semibold text-purple-300 mt-4 mb-2">
            {parseInlineStyles(line.substring(4))}
          </h3>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={`spacer-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-zinc-350 text-xs sm:text-sm leading-relaxed mb-3.5 font-light">
            {parseInlineStyles(line)}
          </p>
        );
      }
    }

    if (inList && listItems.length > 0) {
      elements.push(
        <ul key="ul-final" className="list-disc pl-5 my-3 space-y-1">
          {listItems}
        </ul>
      );
    }
    return <div className="space-y-1">{elements}</div>;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans flex overflow-hidden">
      
      {/* 1. Left Navigation Panel (Linear/Notion Style) */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950/70 flex flex-col shrink-0 hidden md:flex">
        {/* Workspace Brand / Selector */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
          </Link>
        </div>

        <div className="p-4 flex items-center gap-2 bg-purple-950/10 border-b border-zinc-900">
          <div className="p-2 bg-purple-600/15 border border-purple-500/20 text-purple-400 rounded-lg">
            <Folder className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-xs font-bold text-white truncate">{currentWorkspace?.name}</h2>
            <p className="text-[10px] text-zinc-500 truncate">{currentWorkspace?.description || 'AI research space'}</p>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              <span>Conversations</span>
              <button 
                onClick={handleCreateChat}
                className="hover:text-purple-400 p-0.5 rounded transition-colors"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-1">
              {chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrentChatId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 truncate transition-colors ${
                    currentChatId === c.id 
                      ? 'bg-purple-600/10 text-purple-300 border border-purple-500/15' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Notes Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              <span>Research Notes</span>
            </div>
            <div className="space-y-1">
              <Link
                href="/notes"
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Notebook</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-zinc-900 flex items-center gap-2.5 bg-zinc-950/20">
          <div className="w-7 h-7 rounded-full bg-purple-600/35 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-200 shrink-0">
            {user?.full_name[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-zinc-200 truncate">{user?.full_name}</div>
            <div className="text-[10px] text-zinc-500 truncate">{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* 2. Center Pane (Chat & Agent Execution) */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden border-b border-zinc-900 bg-zinc-950/80 px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-xs font-bold text-white truncate max-w-[150px]">{currentWorkspace?.name}</span>
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="p-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Status Warning */}
        {!wsConnected && (
          <div className="bg-amber-950/15 border-b border-amber-900/30 px-6 py-2.5 flex items-center justify-between gap-3 text-amber-500 text-xs">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Server Connection Offline. Verify that the backend is running (`uvicorn app.main:app --reload`).</span>
            </span>
            <button 
              type="button"
              onClick={() => {
                setReconnectTrigger(prev => prev + 1);
              }}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 rounded-lg font-bold transition-all shrink-0 cursor-pointer"
            >
              Reconnect
            </button>
          </div>
        )}

        {/* Top Agent Pipeline Monitor */}
        {Object.values(agentPipeline).some(n => n.status !== 'idle') && (
          <div className="border-b border-zinc-900/80 bg-zinc-950/30 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-xs font-bold text-purple-300">Multi-Agent Workflow Active</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {renderAgentStatusNode('Memory Agent', 0)}
              {renderAgentStatusNode('Research Agent', 1)}
              {renderAgentStatusNode('Summarization Agent', 2)}
              {renderAgentStatusNode('Citation Agent', 3)}
              {renderAgentStatusNode('Report Agent', 4)}
            </div>
          </div>
        )}

        {/* Chat Messages Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <Brain className="w-14 h-14 text-zinc-700 mb-4 animate-pulse" />
              <h3 className="text-white font-bold text-lg mb-2">Deep Research Agent Console</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                Pose queries to invoke your LangGraph research flow. The pipeline will query indexed files and simulated web search to formulate high-confidence syntheses.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                <button 
                  onClick={() => setInputMessage('Compare local file findings against market growth metrics.')}
                  className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-purple-600/40 text-left text-xs text-zinc-400 transition-all hover:text-zinc-300"
                >
                  "Compare local file findings against market growth metrics"
                </button>
                <button 
                  onClick={() => setInputMessage('Outline the strategic risks of our technological direction.')}
                  className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-purple-600/40 text-left text-xs text-zinc-400 transition-all hover:text-zinc-300"
                >
                  "Outline the strategic risks of our technological direction"
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id}
                className={`flex gap-4 max-w-3xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                  m.sender === 'user' 
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}>
                  {m.sender === 'user' ? 'U' : <Brain className="w-4 h-4 text-purple-400" />}
                </div>

                {/* Bubble */}
                <div className="space-y-2">
                  <div className={`px-4 py-3 rounded-2xl border text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-purple-600/10 border-purple-500/20 text-zinc-100 rounded-tr-none'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-300 rounded-tl-none'
                  }`}>
                    {/* Render message formatting simply */}
                    <div className="whitespace-pre-line font-light">{m.content}</div>
                  </div>

                  {/* Inline Citations List */}
                  {m.sender === 'assistant' && m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mr-1">Sources:</span>
                      {m.citations.map((c, index) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setRightPanelTab('citations');
                            setRightPanelOpen(true);
                          }}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                        >
                          <BookOpen className="w-3 h-3 text-purple-400" />
                          <span>[{index + 1}] {c.source_title.slice(0, 15)}...</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Active agent streaming visual feedback */}
          {activePipelineAgent && (
            <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-zinc-400 flex items-center gap-2">
                <span>{activePipelineAgent} is thinking...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Message Input Form */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/30">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder={wsConnected ? "Ask a research topic..." : "Server Offline - Verify uvicorn is running"}
              disabled={!wsConnected}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl pl-4 pr-12 py-3.5 text-sm text-zinc-200 placeholder-zinc-650 outline-none transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || activePipelineAgent !== null || !wsConnected}
              className="absolute right-2 p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </section>

      {/* 3. Right Collapsible Pane (Files, Citations, Reports) */}
      {rightPanelOpen && (
        <aside className="w-80 border-l border-zinc-900 bg-zinc-950/70 flex flex-col shrink-0">
          {/* Tabs Selector */}
          <div className="grid grid-cols-3 border-b border-zinc-900 text-xs">
            <button
              onClick={() => setRightPanelTab('files')}
              className={`py-3.5 font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                rightPanelTab === 'files' 
                  ? 'border-purple-500 text-purple-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setRightPanelTab('citations')}
              className={`py-3.5 font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                rightPanelTab === 'citations' 
                  ? 'border-purple-500 text-purple-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sources
            </button>
            <button
              onClick={() => setRightPanelTab('reports')}
              className={`py-3.5 font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                rightPanelTab === 'reports' 
                  ? 'border-purple-500 text-purple-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Reports
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            
            {/* Tab: Files Dropzone & List */}
            {rightPanelTab === 'files' && (
              <div className="space-y-4">
                {/* Upload Trigger */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-800 hover:border-purple-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-950/30 flex flex-col items-center justify-center gap-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.csv,.txt"
                    onChange={handleFileUpload}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                  )}
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-300">Upload Reference Context</h5>
                    <p className="text-[10px] text-zinc-500 mt-1">PDF, DOCX, CSV, or TXT up to 10MB</p>
                  </div>
                </div>

                {/* Files List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Uploaded Context ({files.length})</h4>
                  {files.length === 0 ? (
                    <p className="text-center text-xs text-zinc-600 py-6">No documents uploaded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {files.map((file) => (
                        <div 
                          key={file.id}
                          className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-900 rounded-lg hover:border-zinc-800/80 group"
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                            <div className="overflow-hidden">
                              <h5 className="text-[11px] font-bold text-zinc-300 truncate" title={file.filename}>
                                {file.filename}
                              </h5>
                              <span className="text-[9px] text-zinc-500 font-medium">
                                {(file.size / 1024).toFixed(1)} KB • {file.file_type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 border border-transparent rounded cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Citations */}
            {rightPanelTab === 'citations' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Verified Citations ({allCitations.length})</h4>
                {allCitations.length === 0 ? (
                  <p className="text-center text-xs text-zinc-600 py-6">Ask research questions to view factual sources cited by the agents.</p>
                ) : (
                  <div className="space-y-3">
                    {allCitations.map((cite, index) => (
                      <div 
                        key={cite.id}
                        className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-3.5 space-y-2 hover:border-zinc-800 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <h5 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-4.5 h-4.5 bg-purple-600/15 border border-purple-500/20 rounded-md text-purple-400 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <span className="truncate">{cite.source_title}</span>
                          </h5>
                          {cite.source_url && (
                            <a 
                              href={cite.source_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/5 p-1 border border-transparent hover:border-purple-500/10 rounded transition-all shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {cite.snippet && (
                          <blockquote className="text-[11px] text-zinc-500 leading-relaxed border-l border-purple-500/30 pl-2 py-0.5 bg-zinc-950/20 rounded-r-md italic">
                            "{cite.snippet}"
                          </blockquote>
                        )}
                        <div className="text-[9px] text-purple-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>Confidence: {(cite.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Reports list */}
            {rightPanelTab === 'reports' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Research Reports ({reports.length})</h4>
                {reports.length === 0 ? (
                  <p className="text-center text-xs text-zinc-600 py-6">No research reports generated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {reports.map((rep) => (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedReport(rep)}
                        className={`w-full text-left p-3 border rounded-xl flex items-center justify-between gap-2 transition-all ${
                          selectedReport?.id === rep.id 
                            ? 'bg-purple-600/10 border-purple-500/30 text-purple-300' 
                            : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-xs font-semibold truncate">{rep.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </aside>
      )}

      {/* Report Modal Viewer */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl max-h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-[300px] sm:max-w-[400px]">{selectedReport.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadReport}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white border border-transparent rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MD</span>
                </button>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed">
              {renderMarkdownContent(selectedReport.markdown_content)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
