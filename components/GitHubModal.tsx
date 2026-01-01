import React, { useState } from 'react';
import { Github, Loader2, X, Link as LinkIcon, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { GitHubConfig } from '../types';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: GitHubConfig) => Promise<void>;
  isPushing: boolean;
  mode?: 'push' | 'sync'; // Sync mode just asks for auth to check status
  initialRepo?: string; // Pre-fill if known
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isPushing, 
  mode = 'push',
  initialRepo = ''
}) => {
  const [repoUrl, setRepoUrl] = useState(initialRepo);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const regex = /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/;
    const match = repoUrl.trim().match(regex);

    if (!match) {
      setError('Invalid GitHub Repository URL. Must be in format https://github.com/owner/repo');
      return;
    }

    const config: GitHubConfig = {
      owner: match[1],
      repo: match[2],
      token: token.trim(),
      branchBase: 'main',
      reviewers: '' 
    };

    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {mode === 'push' ? <Github className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
            {mode === 'push' ? 'Push to GitHub' : 'Authenticate GitHub'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-200 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Repository URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="url"
                required
                className="w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Personal Access Token (PAT)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                placeholder="ghp_..."
                value={token}
                onChange={e => setToken(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isPushing}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
            >
              {isPushing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {mode === 'push' ? 'Pushing...' : 'Syncing...'}
                </>
              ) : (
                <>
                  {mode === 'push' ? <Github className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {mode === 'push' ? 'Push Controls' : 'Check PR Status'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
