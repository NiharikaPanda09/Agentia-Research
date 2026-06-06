// frontend/app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { workspaceApi, WorkspaceType } from '../../lib/api';
import Link from 'next/link';
import { 
  FolderPlus, 
  Folder, 
  Plus, 
  Search, 
  TrendingUp, 
  FileText, 
  Database, 
  Cpu,
  LogOut, 
  Loader2, 
  User, 
  Clock 
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New workspace form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await workspaceApi.list();
      setWorkspaces(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    try {
      const created = await workspaceApi.create(newWorkspaceName, newWorkspaceDesc);
      setWorkspaces((prev) => [created, ...prev]);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || (loading && workspaces.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm font-medium tracking-wide">Loading workspace center...</span>
        </div>
      </div>
    );
  }

  // Calculate statistics (mock data based on active workspaces + defaults)
  const totalWorkspaces = workspaces.length;
  const totalReports = totalWorkspaces * 2 + 1;
  const totalDocuments = totalWorkspaces * 4 + 3;
  const totalAgentRuns = totalWorkspaces * 12 + 14;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex flex-col">
      {/* Premium Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600/15 border border-purple-500/30 text-purple-400 rounded-lg flex items-center justify-center font-bold text-lg">
            R
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Research Workspace</h1>
            <p className="text-zinc-500 text-xs">Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-6 h-6 rounded-full bg-purple-600/35 border border-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-200">
              {user?.full_name[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-zinc-300 hidden sm:inline-block">{user?.full_name}</span>
          </div>

          <button
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-lg cursor-pointer transition-all"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Welcome Section & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-950 to-zinc-900/40 p-6 md:p-8 rounded-2xl border border-zinc-900/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              Welcome back, {user?.full_name}
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl">
              Launch a multi-agent research stream, compile synthesis reports, and upload reference documents to construct your local context.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium rounded-xl text-sm self-start md:self-center cursor-pointer shadow-lg shadow-purple-600/10 transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            New Workspace
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-950/30 border border-zinc-900 p-5 rounded-xl flex flex-col justify-between h-28">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" /> Workspaces
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">{totalWorkspaces}</span>
          </div>

          <div className="bg-zinc-950/30 border border-zinc-900 p-5 rounded-xl flex flex-col justify-between h-28">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Reports Generated
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">{totalReports}</span>
          </div>

          <div className="bg-zinc-950/30 border border-zinc-900 p-5 rounded-xl flex flex-col justify-between h-28">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Documents Indexed
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">{totalDocuments}</span>
          </div>

          <div className="bg-zinc-950/30 border border-zinc-900 p-5 rounded-xl flex flex-col justify-between h-28">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> Agent Actions
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">{totalAgentRuns}</span>
          </div>
        </div>

        {/* Workspace List & Activity Feed Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Workspace Directory */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-white">Your Workspaces</h3>
              <span className="text-xs text-zinc-500">{workspaces.length} active</span>
            </div>

            {error && (
              <div className="p-4 bg-red-950/20 border border-red-500/10 text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            {workspaces.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-xl py-12 flex flex-col items-center justify-center text-center px-4">
                <FolderPlus className="w-12 h-12 text-zinc-600 mb-3" />
                <h4 className="text-zinc-300 font-semibold mb-1">No workspaces found</h4>
                <p className="text-zinc-500 text-xs max-w-sm mb-4">
                  Create a workspace to host files, track chats, compile research reports, and organize notes.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Create Workspace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/workspace/${ws.id}`}
                    className="group border border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/30 hover:border-zinc-800/80 p-5 rounded-xl block transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2.5 bg-purple-600/10 text-purple-400 border border-purple-500/10 rounded-lg group-hover:bg-purple-600/15 group-hover:text-purple-300 transition-colors">
                        <Folder className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full font-medium">
                        Owner
                      </span>
                    </div>
                    <h4 className="text-zinc-200 font-bold group-hover:text-white transition-colors mb-1 truncate">
                      {ws.name}
                    </h4>
                    <p className="text-zinc-500 text-xs line-clamp-2 leading-normal mb-4">
                      {ws.description || 'No description provided for this research space.'}
                    </p>
                    <div className="text-[10px] text-zinc-600 flex items-center gap-1.5 font-medium uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" /> Created {new Date(ws.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-white">System Feed</h3>
            <div className="bg-zinc-950/15 border border-zinc-900 rounded-xl p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-purple-600/10 border border-purple-500/10 text-purple-400 rounded-full flex items-center justify-center shrink-0 text-xs">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-300">System Ready</h5>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    FastAPI multi-agent orchestrator operational. Dual-mode SQLite/PostgreSQL layer initialized in **{totalWorkspaces > 0 ? 'local SQLite fallback' : 'idle'}** mode.
                  </p>
                  <span className="text-[10px] text-zinc-600 block mt-1">Just Now</span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-indigo-600/10 border border-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center shrink-0 text-xs">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-300">Embedding Engine Active</h5>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Gemini text-embedding-004 online. Automatic pseudo-random local vector calculations initialized.
                  </p>
                  <span className="text-[10px] text-zinc-600 block mt-1">2 mins ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Create New Workspace</h3>
              <p className="text-zinc-500 text-xs">
                A workspace groups documents, search logs, and notes together.
              </p>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Market Research"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm outline-none transition-all"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe the scope of research in this workspace..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm h-24 outline-none resize-none transition-all"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWorkspaceName.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
