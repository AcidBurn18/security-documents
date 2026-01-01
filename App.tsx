import React, { useState } from 'react';
import { InputSection } from './components/InputSection';
import { ControlsTable } from './components/ControlsTable';
import { generateSecurityControls } from './services/geminiService';
import { SecurityControl, AppState } from './types';
import { Loader2, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [controls, setControls] = useState<SecurityControl[]>([]);
  const [serviceName, setServiceName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleGenerate = async (inputService: string) => {
    setAppState(AppState.LOADING);
    setServiceName(inputService);
    setErrorMessage('');
    
    try {
      const data = await generateSecurityControls(inputService);
      setControls(data);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to generate security controls. Please ensure the API Key is valid and try again.");
      setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Decorative background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent opacity-50"></div>
         <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>
         <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
      </div>

      <main className="flex-1 relative z-10 container mx-auto px-4 py-12 md:py-20">
        
        <InputSection 
          onGenerate={handleGenerate} 
          isLoading={appState === AppState.LOADING} 
        />

        {appState === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center mt-20 animate-pulse">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">Analyzing Cloud Service...</h3>
            <p className="text-slate-500 mt-2">Consulting security frameworks (CIS, NIST)...</p>
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="max-w-xl mx-auto mt-10 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Generation Error</h3>
              <p className="text-red-600 mt-1 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {appState === AppState.SUCCESS && (
          <ControlsTable data={controls} serviceName={serviceName} />
        )}

      </main>

      <footer className="relative z-10 py-6 text-center text-slate-400 text-sm border-t border-slate-200 mt-auto bg-slate-50/80 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} CloudGuard Gen. AI-generated content can be inaccurate.</p>
      </footer>
    </div>
  );
};

export default App;