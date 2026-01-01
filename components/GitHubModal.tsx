import React, { useState } from 'react';
import { Github, Loader2, X } from 'lucide-react';
import { GitHubConfig } from '../types';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: GitHubConfig) => Promise<void>;
  isPushing: boolean;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose, onSubmit, isPushing }) => {
  const [config, setConfig] = useState<GitHubConfig>({
    owner: '',
    repo: '',
    token: '',
    reviewers: '',
    branchBase: 'main'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Github className="w-5 h-5" /> Push to GitHub
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Owner / Org</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. facebook"
                value={config.owner}
                onChange={e => setConfig({...config, owner: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Repo Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. react"
                value={config.repo}
                onChange={e => setConfig({...config, repo: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Personal Access Token (PAT)</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="ghp_..."
              value={config.token}
              onChange={e => setConfig({...config, token: e.target.value})}
            />
            <p className="text-[10px] text-slate-400 mt-1">Token must have 'repo' scope. Not saved significantly.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Base Branch</label>
               <input
                 type="text"
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                 value={config.branchBase}
                 onChange={e => setConfig({...config, branchBase: e.target.value})}
               />
            </div>
            <div>
               <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reviewers (Optional)</label>
               <input
                 type="text"
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                 placeholder="user1, user2"
                 value={config.reviewers}
                 onChange={e => setConfig({...config, reviewers: e.target.value})}
               />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPushing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPushing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Pushing...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" /> Raise Pull Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};