// frontend/app/notes/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { noteApi, workspaceApi, NoteType, WorkspaceType } from '../../lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Loader2, 
  Folder, 
  ChevronRight,
  Edit3
} from 'lucide-react';

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();

  // Core State
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [currentNote, setCurrentNote] = useState<NoteType | null>(null);

  // Editor State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Fetch Workspaces & Initial Notes
  useEffect(() => {
    if (!user) return;

    const initNotes = async () => {
      try {
        setLoading(true);
        const wsList = await workspaceApi.list();
        setWorkspaces(wsList);

        if (wsList.length > 0) {
          setSelectedWorkspaceId(wsList[0].id);
          const noteList = await noteApi.list(wsList[0].id);
          setNotes(noteList);
          if (noteList.length > 0) {
            handleSelectNote(noteList[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching notebooks:', err);
      } finally {
        setLoading(false);
      }
    };

    initNotes();
  }, [user]);

  // Fetch notes when workspace selection changes
  const handleWorkspaceChange = async (wsId: string) => {
    setSelectedWorkspaceId(wsId);
    setCurrentNote(null);
    setNoteTitle('');
    setNoteContent('');
    setAiSuggestions('');
    try {
      setLoading(true);
      const noteList = await noteApi.list(wsId);
      setNotes(noteList);
      if (noteList.length > 0) {
        handleSelectNote(noteList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = (note: NoteType) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setAiSuggestions('');
  };

  const handleCreateNote = async () => {
    if (!selectedWorkspaceId) {
      alert('Please select or create a workspace first.');
      return;
    }

    try {
      const created = await noteApi.create('Untitled Research Note', '', selectedWorkspaceId);
      setNotes(prev => [created, ...prev]);
      handleSelectNote(created);
    } catch (err) {
      alert('Failed to create note');
    }
  };

  const handleSaveNote = async () => {
    if (!currentNote) return;

    setSaving(true);
    try {
      const updated = await noteApi.update(currentNote.id, noteTitle, noteContent, currentNote.linked_chat_id);
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setCurrentNote(updated);
    } catch (err) {
      alert('Failed to save note contents');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this research note?')) return;

    try {
      await noteApi.delete(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
        setNoteTitle('');
        setNoteContent('');
        setAiSuggestions('');
      }
    } catch (err) {
      alert('Failed to delete note');
    }
  };

  // Run Simulated AI Insights assistant
  const handleGenerateAiSuggestions = async () => {
    if (!noteContent.trim()) {
      setAiSuggestions('Write some notes first, then click get insights to process active summaries.');
      return;
    }

    setLoadingAi(true);
    try {
      // Simulate processing latency
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAiSuggestions(
        `### AI Synthesis Suggestion:\n` +
        `Based on your draft, here are strategic considerations:\n` +
        `1. **Corroborative Data**: Cross-check the growth rate metrics in sector 3 against uploaded PDF documents.\n` +
        `2. **Risk Expansion**: Consider adding a subsection regarding regulatory compliance factors.\n` +
        `3. **Key Citations**: Link this page to the corresponding Research Chat for structured sources.`
      );
    } catch (err) {
      setAiSuggestions('Failed to generate suggestions.');
    } finally {
      setLoadingAi(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm font-medium tracking-wide">Syncing research notebook...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h1 className="text-base font-semibold text-white">Research Notebook</h1>
          </div>
        </div>

        {/* Workspace Selector dropdown */}
        <div className="flex items-center gap-3">
          <Folder className="w-4 h-4 text-zinc-500" />
          <select
            className="bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-medium outline-none cursor-pointer"
            value={selectedWorkspaceId}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Tri-Pane layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Pane 1: Notes Sidebar (List) */}
        <aside className="w-72 border-r border-zinc-900 bg-zinc-950/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Saved Notes ({notes.length})</span>
            <button 
              onClick={handleCreateNote}
              className="p-1 hover:bg-zinc-900 border border-zinc-800/80 rounded text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer"
              title="Create Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {notes.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-12">No notes in this workspace.</p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className={`w-full group rounded-xl p-3 flex items-start justify-between gap-2 border cursor-pointer transition-all ${
                    currentNote?.id === n.id
                      ? 'bg-purple-600/10 border-purple-500/20 text-purple-300'
                      : 'bg-transparent border-transparent hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
                  }`}
                  onClick={() => handleSelectNote(n)}
                >
                  <div className="overflow-hidden space-y-1">
                    <h4 className="text-xs font-bold truncate group-hover:text-white transition-colors">
                      {n.title || 'Untitled Note'}
                    </h4>
                    <p className="text-[10px] text-zinc-500 line-clamp-1 leading-normal">
                      {n.content ? n.content.substring(0, 40) : 'No content'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-transparent rounded cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Pane 2: Editor (Center Pane) */}
        <section className="flex-1 flex flex-col bg-[#050505] min-w-0">
          {currentNote ? (
            <div className="flex-1 flex flex-col p-6 space-y-6">
              
              {/* Title & Save Bar */}
              <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                <input
                  type="text"
                  className="bg-transparent border-none outline-none font-bold text-xl md:text-2xl text-white w-full placeholder-zinc-700"
                  placeholder="Note Title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
                <button
                  onClick={handleSaveNote}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-purple-600/10 transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
              </div>

              {/* Note Content Editor */}
              <textarea
                className="flex-1 bg-transparent border-none outline-none resize-none font-light text-zinc-300 text-sm md:text-base leading-relaxed placeholder-zinc-700"
                placeholder="Start drafting research summaries, insights, and references..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Edit3 className="w-12 h-12 text-zinc-700 mb-3 animate-pulse" />
              <h3 className="text-zinc-400 font-bold mb-1">No Note Selected</h3>
              <p className="text-zinc-600 text-xs max-w-sm mb-4">
                Select a note from the sidebar or click Create Note to begin drafting.
              </p>
              <button
                onClick={handleCreateNote}
                className="py-2.5 px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Create Note
              </button>
            </div>
          )}
        </section>

        {/* Pane 3: AI Suggestions (Right Panel) */}
        {currentNote && (
          <aside className="w-80 border-l border-zinc-900 bg-zinc-950/40 flex flex-col shrink-0 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">AI Coprocessor</span>
              <button
                onClick={handleGenerateAiSuggestions}
                disabled={loadingAi}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Get Insights</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <span className="text-[11px] font-medium">Analyzing note context...</span>
                </div>
              ) : aiSuggestions ? (
                <div className="prose prose-invert max-w-none text-xs text-zinc-400 leading-relaxed font-light whitespace-pre-line bg-zinc-950/30 border border-zinc-900/60 p-4 rounded-xl">
                  {aiSuggestions}
                </div>
              ) : (
                <p className="text-center text-xs text-zinc-600 py-12 px-4 leading-relaxed">
                  Need writing support? Click **Get Insights** above to analyze note drafts and recommend expansions.
                </p>
              )}
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
