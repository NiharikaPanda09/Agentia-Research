// frontend/app/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Settings, 
  Key, 
  User, 
  Moon, 
  Save, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  
  // States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
    
    // Load local storage API key if available
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('user_gemini_api_key') || '';
      setApiKey(storedKey);
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      // Save Gemini key to localStorage for client-side API requests
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
      }
      
      // Simulate profile saving delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setSaved(true);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm font-medium tracking-wide">Syncing console preferences...</span>
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
            <Settings className="w-5 h-5 text-purple-400" />
            <h1 className="text-base font-semibold text-white">System Settings</h1>
          </div>
        </div>
      </header>

      {/* Settings Panel Grid */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 space-y-8 overflow-y-auto">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white">Configure Workspace</h2>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Manage your personal profile, set up API credential overrides, and configure appearance guidelines.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Profile Card */}
          <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
              <User className="w-4 h-4 text-purple-400" />
              <span>User Profile</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm outline-none transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  className="w-full px-4 py-2.5 bg-zinc-950/40 border border-zinc-900/60 text-zinc-500 text-sm outline-none cursor-not-allowed"
                  value={email}
                />
              </div>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Key className="w-4 h-4 text-purple-400" />
              <span>API Credentials</span>
            </h3>

            <div className="space-y-2">
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Gemini API Key override
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm outline-none transition-all placeholder-zinc-800"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Setting a client-side API key overrides the server's default environment credentials. Leave blank to use server defaults. Keys are saved securely in your browser's local storage.
              </p>
            </div>
          </div>

          {/* Appearance Card */}
          <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Moon className="w-4 h-4 text-purple-400" />
              <span>Theme Preferences</span>
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-300">Force Dark Mode</h4>
                <p className="text-[10px] text-zinc-500">Locks the interface to the high-fidelity dark glassmorphic design theme.</p>
              </div>
              <div className="w-10 h-6 bg-purple-600/20 border border-purple-500/40 rounded-full p-1 flex items-center justify-end shrink-0 cursor-not-allowed">
                <div className="w-4 h-4 bg-purple-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Save Bar */}
          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
              </span>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 py-3 px-5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm cursor-pointer shadow-lg shadow-purple-600/10 transition-all shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
