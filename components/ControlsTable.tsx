import React, { useState, useMemo } from 'react';
import { SecurityControl, GitHubConfig } from '../types';
import { Download, FileText, CheckCircle2, ThumbsUp, ThumbsDown, Send, Layers, Database, Github, ExternalLink } from 'lucide-react';
import { GitHubModal } from './GitHubModal';
import { pushToGitHub } from '../services/githubService';

interface ControlsTableProps {
  data: SecurityControl[];
  serviceName: string;
}

export const ControlsTable: React.FC<ControlsTableProps> = ({ data, serviceName }) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // GitHub State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  // Separate data into planes
  const { controlPlane, dataPlane } = useMemo(() => {
    return {
      controlPlane: data.filter(c => c.plane === 'Control Plane'),
      dataPlane: data.filter(c => c.plane === 'Data Plane')
    };
  }, [data]);

  const downloadCSV = () => {
    const headers = ['Control ID', 'Control Name', 'Control Description', 'Plane', 'Mapping'];
    
    // Helper to format rows
    const formatRow = (item: SecurityControl) => [
      `"${item.controlId}"`,
      `"${item.controlName}"`,
      `"${item.controlDescription.replace(/"/g, '""')}"`,
      `"${item.plane}"`,
      `"${item.mapping}"`
    ];

    const rows = [
      ...controlPlane.map(formatRow),
      ...dataPlane.map(formatRow)
    ];

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

  const handleGitHubPush = async (config: GitHubConfig) => {
    setIsPushing(true);
    try {
      const url = await pushToGitHub(config, serviceName, data);
      setPrUrl(url);
      setIsModalOpen(false);
    } catch (error) {
      alert("Failed to push to GitHub. Check your token and permissions.");
      console.error(error);
    } finally {
      setIsPushing(false);
    }
  };

  const handleSubmitFeedback = () => {
    console.log('Feedback submitted:', { type: feedback, comment, service: serviceName });
    setSubmitted(true);
  };

  if (data.length === 0) return null;

  const renderSection = (title: string, icon: React.ReactNode, controls: SecurityControl[], bgColor: string) => {
    if (controls.length === 0) return null;
    return (
      <>
        <tr className={`${bgColor} border-b border-slate-200`}>
          <td colSpan={4} className="p-3 font-semibold text-slate-700 flex items-center gap-2">
            {icon} {title} ({controls.length})
          </td>
        </tr>
        {controls.map((control, index) => (
          <tr 
            key={`${title}-${index}`} 
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
        ))}
      </>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up mt-8">
      
      <GitHubModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleGitHubPush}
        isPushing={isPushing}
      />

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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 rounded-lg text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            <Github className="w-4 h-4" />
            Push to GitHub
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {prUrl && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-fade-in">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Github className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h4 className="font-semibold text-green-800">Pull Request Created!</h4>
                <p className="text-sm text-green-600">The security controls have been pushed to a new branch.</p>
              </div>
           </div>
           <a 
            href={prUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
           >
             View PR <ExternalLink className="w-3 h-3" />
           </a>
        </div>
      )}

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
              {renderSection("Control Plane", <Layers className="w-4 h-4 text-purple-600" />, controlPlane, "bg-purple-50")}
              {renderSection("Data Plane", <Database className="w-4 h-4 text-teal-600" />, dataPlane, "bg-teal-50")}
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
                <button
                  onClick={() => setFeedback('up')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    feedback === 'up' 
                      ? 'bg-green-100 border-green-300 text-green-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" /> Yes
                </button>
                <button
                  onClick={() => setFeedback('down')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    feedback === 'down' 
                      ? 'bg-red-100 border-red-300 text-red-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" /> No
                </button>
              </div>
              
              <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${feedback ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional feedback..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSubmitFeedback}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 animate-fade-in">
               <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
               </div>
               <p className="text-sm font-medium text-slate-800">Thanks for your feedback!</p>
               <p className="text-xs text-slate-500 mt-1">We'll use it to improve future results.</p>
            </div>
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