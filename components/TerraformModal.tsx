import React from 'react';
import { X, Copy, Download, Check, Terminal } from 'lucide-react';

interface TerraformModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  serviceName: string;
}

export const TerraformModal: React.FC<TerraformModalProps> = ({ isOpen, onClose, code, serviceName }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName.replace(/\s+/g, '_').toLowerCase()}.tf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" /> 
            Terraform Configuration: {serviceName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
           <pre className="h-full w-full overflow-auto p-6 text-sm font-mono text-slate-800 custom-scrollbar whitespace-pre">
             {code}
           </pre>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download .tf
          </button>
        </div>
      </div>
    </div>
  );
};