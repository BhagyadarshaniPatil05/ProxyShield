import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, FileText, Database } from 'lucide-react';

const Navbar = ({ backendConnected, mlConnected }) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400 transition-all">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-100 tracking-tight">Proxy<span className="text-cyan-400">Shield</span></span>
            <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Offline Framework</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Service Status Badges */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-400">Backend:</span>
            <span className={backendConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {backendConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${mlConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-400">ML Engine:</span>
            <span className={mlConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {mlConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        <Link
          to="/upload"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
        >
          <Database className="w-3.5 h-3.5" />
          New Audit
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
