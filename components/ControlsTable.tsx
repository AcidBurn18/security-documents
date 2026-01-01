import React, { useState, useMemo } from 'react';
import { SecurityControl, GitHubConfig, PRContext, PRStatus } from '../types';
import { Download, FileText, CheckCircle2, ThumbsUp, ThumbsDown, Layers, Database, Github, ExternalLink, RefreshCw, GitMerge, Loader2, Code2 } from 'lucide-react';
import { GitHubModal } from './GitHubModal';
import { TerraformModal } from './TerraformModal';
import { pushToGitHub, getPRDetails, updateExistingBranch } from '../services/githubService';
import { saveContext, updateContextStatus } from '../services/storageService';
import { regenerateControlsWithFeedback, generateTerraform } from '../services/geminiService';

interface ControlsTableProps {
  data: SecurityControl[];
  serviceName: string;
  existingContext: PRContext | null;
  onContextUpdate: (newContext: PRContext) => void;
  sessionToken: string;
  setSessionToken: (token: string) => void;
}

export const ControlsTable: React.FC<ControlsTableProps> = ({ 
  data, 
  serviceName, 
  existingContext,
  onContextUpdate,
  sessionToken,
  setSessionToken
}) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'control' | 'data'>('all');

  // GitHub State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [modalMode, setModalMode] = useState<'push' | 'sync'>('push');
  const [syncMessage, setSyncMessage] = useState<string>('');
  
  // Terraform State
  const [isTerraformModalOpen, setIsTerraformModalOpen] = useState(false);
  const [isGeneratingTerraform, setIsGeneratingTerraform] = useState(false);
  const [terraformCode, setTerraformCode] = useState('');

  // Memoized planes
  const { controlPlane, dataPlane } = useMemo(() => {
    return {
      controlPlane: data.filter(c => c.plane === 'Control Plane'),
      dataPlane: data.filter(c => c.plane === 'Data Plane')
    };
  }, [data]);

  const downloadCSV = () => {
    const headers = ['Control ID', 'Control Name', 'Control Description', 'Plane', 'Mapping'];
    const formatRow = (item: SecurityControl) => [
      `"${item.controlId}"`,
      `"${item.controlName}"`,
      `"${item.controlDescription.replace(/"/g, '""')}"`,
      `"${item.plane}"`,
      `"${item.mapping}"`
    ];
    const rows = [...controlPlane.map(formatRow), ...dataPlane.map(formatRow)];
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${serviceName.replace(/\s+/g, '_')}_Security_Controls.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateTerraform = async () => {
    setIsGeneratingTerraform(true);
    try {
      const code = await generateTerraform(serviceName, data);
      setTerraformCode(code);
      setIsTerraformModalOpen(true);
    } catch (error) {
      alert("Failed to generate Terraform code. Please try again.");
    } finally {
      setIsGeneratingTerraform(false);
    }
  };

  // Reusable Sync Logic
  const performSync = async (config: GitHubConfig) => {
    if (!existingContext) return;
    
    setIsPushing(true);
    setSyncMessage('Checking PR status...');

    try {
        const details = await getPRDetails(config, existingContext.prNumber);

        if (details.merged) {
          setSyncMessage('PR Merged! Saving approved controls...');
          updateContextStatus(serviceName, PRStatus.MERGED);
          onContextUpdate({ ...existingContext, status: PRStatus.MERGED });
          if (isModalOpen) setTimeout(() => setIsModalOpen(false), 1500);

        } else if (details.feedback && details.feedback.trim().length > 0 && details.status !== PRStatus.MERGED) {
          setSyncMessage('Found comments. Regenerating controls with AI...');
          
          const updatedControls = await regenerateControlsWithFeedback(
            serviceName, 
            data, 
            details.feedback
          );
          
          if (details.status === PRStatus.CLOSED) {
             setSyncMessage('PR was Closed. Creating NEW PR with fixes...');
             const pushResult = await pushToGitHub(config, serviceName, updatedControls);
             
             const newContext: PRContext = {
                ...existingContext,
                prNumber: pushResult.number,
                prUrl: pushResult.html_url,
                branchName: pushResult.branch,
                status: PRStatus.OPEN,
                lastUpdated: new Date().toISOString(),
                controls: updatedControls
             };
             saveContext(newContext);
             onContextUpdate(newContext);

          } else {
             setSyncMessage('Updating existing PR with new controls...');
             await updateExistingBranch(config, serviceName, existingContext.branchName, updatedControls);
             updateContextStatus(serviceName, PRStatus.OPEN, updatedControls);
             onContextUpdate({ ...existingContext, controls: updatedControls });
          }
          if (isModalOpen) setTimeout(() => setIsModalOpen(false), 1500);

        } else if (details.status === PRStatus.CLOSED) {
            setSyncMessage('PR Closed without feedback. Creating fresh PR...');
             const pushResult = await pushToGitHub(config, serviceName, data);
             const newContext: PRContext = {
                ...existingContext,
                prNumber: pushResult.number,
                prUrl: pushResult.html_url,
                branchName: pushResult.branch,
                status: PRStatus.OPEN,
                lastUpdated: new Date().toISOString(),
                controls: data 
             };
             saveContext(newContext);
             onContextUpdate(newContext);
             if (isModalOpen) setTimeout(() => setIsModalOpen(false), 1500);
        } else {
          setSyncMessage('No changes needed. PR is still Open.');
          if (isModalOpen) setTimeout(() => setIsModalOpen(false), 1000);
        }
    } catch (error: any) {
        alert(`GitHub Error: ${error.message}`);
        console.error(error);
    } finally {
        setIsPushing(false);
        setSyncMessage('');
    }
  };

  const handleGitHubAction = async (config: GitHubConfig) => {
    // 1. Capture token for this session
    setSessionToken(config.token);

    if (modalMode === 'push') {
        // --- NEW PUSH ---
        setIsPushing(true);
        try {
            const result = await pushToGitHub(config, serviceName, data);
            
            const newContext: PRContext = {
                serviceName,
                prNumber: result.number,
                prUrl: result.html_url,
                branchName: result.branch,
                repoOwner: result.owner,
                repoName: result.repo,
                status: PRStatus.OPEN,
                lastUpdated: new Date().toISOString(),
                controls: data
            };
            
            saveContext(newContext);
            onContextUpdate(newContext);
            setIsModalOpen(false);
        } catch (error: any) {
            alert(`GitHub Error: ${error.message}`);
        } finally {
            setIsPushing(false);
        }

    } else if (modalMode === 'sync') {
        // --- SYNC via Modal ---
        await performSync(config);
    }
  };

  const handleQuickSync = () => {
      if (sessionToken && existingContext) {
          // Use cached token, bypass modal
          const config: GitHubConfig = {
              owner: existingContext.repoOwner,
              repo: existingContext.repoName,
              token: sessionToken,
              branchBase: 'main', 
              reviewers: ''
          };
          performSync(config);
      } else {
          // No token, open modal
          setModalMode('sync');
          setIsModalOpen(true);
      }
  };

  const openPushModal = () => {
    setModalMode('push');
    setIsModalOpen(true);
  };

  const StatusBanner = () => {
    if (!existingContext) return null;

    if (existingContext.status === PRStatus.MERGED) {
        return (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-full">
                        <GitMerge className="w-5 h-5 text-indigo-700" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900">Approved Security Controls</h4>
                        <p className="text-sm text-indigo-700">These controls were merged into the repository.</p>
                    </div>
                </div>
                 <div className="flex gap-2">
                    <button onClick={handleQuickSync} title="Refresh Status" className="p-2 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors">
                         <RefreshCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
                    </button>
                    <a href={existingContext.prUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 px-3 py-2">
                        View PR <ExternalLink className="w-3 h-3"/>
                    </a>
                 </div>
            </div>
        )
    }

    if (existingContext.status === PRStatus.OPEN) {
        return (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-full">
                        <Github className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                        <h4 className="font-bold text-yellow-900">PR #{existingContext.prNumber} is Open</h4>
                        <p className="text-sm text-yellow-700">Pending review. Check status to sync feedback or merge.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleQuickSync} disabled={isPushing} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70">
                        <RefreshCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} /> Check Status / Sync
                    </button>
                    <a href={existingContext.prUrl} target="_blank" rel="noreferrer" className="px-3 py-2 text-yellow-800 hover:bg-yellow-100 rounded-lg transition-colors">
                         <ExternalLink className="w-4 h-4"/>
                    </a>
                </div>
            </div>
        )
    }
    
    return null;
  };

  if (data.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up mt-8">
      
      <GitHubModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleGitHubAction}
        isPushing={isPushing}
        mode={modalMode}
        initialRepo={existingContext ? `https://github.com/${existingContext.repoOwner}/${existingContext.repoName}` : ''}
      />
      
      <TerraformModal 
        isOpen={isTerraformModalOpen}
        onClose={() => setIsTerraformModalOpen(false)}
        code={terraformCode}
        serviceName={serviceName}
      />

      {/* Loading Overlay for Sync Messages */}
      {isPushing && syncMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/90 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="font-medium">{syncMessage}</span>
            </div>
        </div>
      )}

      {/* Loading Overlay for Terraform */}
      {isGeneratingTerraform && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div className="bg-indigo-900/90 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                <span className="font-medium">Generating Terraform Code...</span>
            </div>
        </div>
      )}

      <StatusBanner />

      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="text-green-500 w-6 h-6" />
            Security Controls: {serviceName}
          </h2>
          <p className="text-slate-500 mt-1">Generated {data.length} controls mapped to CIS & NIST.</p>
        </div>
        
        <div className="flex gap-2">
           <button
             onClick={handleGenerateTerraform}
             disabled={isGeneratingTerraform}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-600 rounded-lg text-white hover:bg-indigo-700 transition-all shadow-sm"
           >
             <Code2 className="w-4 h-4" />
             Terraform
           </button>
           
           {(!existingContext || existingContext.status === PRStatus.CLOSED) && (
              <button
                onClick={openPushModal}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 rounded-lg text-white hover:bg-slate-800 transition-all shadow-sm"
              >
                <Github className="w-4 h-4" />
                Push to GitHub
              </button>
           )}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Controls
          </button>
          <button
            onClick={() => setActiveFilter('control')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeFilter === 'control'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" /> Control Plane
          </button>
          <button
            onClick={() => setActiveFilter('data')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeFilter === 'data'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-4 h-4" /> Data Plane
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32 bg-slate-50">Control ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48 bg-slate-50">Control Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Control Description</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-64 bg-slate-50">Mapping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Table logic remains same, just rendering rows */}
              {data.map((control, index) => {
                 const show = activeFilter === 'all' || 
                              (activeFilter === 'control' && control.plane === 'Control Plane') ||
                              (activeFilter === 'data' && control.plane === 'Data Plane');
                 if (!show) return null;
                 
                 return (
                  <tr 
                    key={index} 
                    className="hover:bg-blue-50/50 transition-colors duration-150 group border-b border-slate-100 last:border-0"
                  >
                    <td className="p-4 align-top">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-100 group-hover:text-blue-700">
                        {control.controlId}
                      </span>
                    </td>
                    <td className="p-4 align-top font-medium text-slate-800">
                      {control.controlName}
                    </td>
                    <td className="p-4 align-top text-slate-600 text-sm leading-relaxed">
                      {control.controlDescription}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {control.mapping.split(/[,;]/).map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                 )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Feedback Section */}
      <div className="mt-6 flex justify-center">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full max-w-md transition-all">
          {!submitted ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-slate-700">Was this result helpful?</p>
              <div className="flex gap-4">
                <button onClick={() => setFeedback('up')} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${feedback === 'up' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                  <ThumbsUp className="w-4 h-4" /> Yes
                </button>
                <button onClick={() => setFeedback('down')} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${feedback === 'down' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                  <ThumbsDown className="w-4 h-4" /> No
                </button>
              </div>
            </div>
          ) : (
             <div className="text-center text-sm text-green-600 font-medium">Feedback submitted!</div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-slate-400">
        <p className="flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Generated by Gemini 1.5 Pro • Verify compliance requirements with your internal audit team.
        </p>
      </div>
    </div>
  );
};