import React, { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (serviceName: string) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onGenerate(inputValue.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
          CloudGuard Gen
        </h1>
        <p className="text-lg text-slate-600">
          Generate audit-ready security control documentation mapped to NIST & CIS standards for AWS, Azure, or GCP services.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-blue-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-200"></div>
        <div className="relative flex items-center bg-white shadow-xl rounded-xl p-2 border border-slate-200">
          <div className="pl-4 text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <input
            type="text"
            className="flex-1 px-4 py-3 text-lg outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
            placeholder="e.g. AWS S3 Bucket, Azure SQL, Google Cloud Run..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={`
              px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200
              ${isLoading || !inputValue.trim() 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'}
            `}
          >
            {isLoading ? 'Generating...' : 'Generate Docs'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {['AWS S3 Bucket', 'Azure Key Vault', 'Google Compute Engine', 'AWS Lambda', 'Azure AKS'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => {
              setInputValue(suggestion);
              onGenerate(suggestion);
            }}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-full text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};