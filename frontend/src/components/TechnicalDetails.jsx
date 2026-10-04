import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code2, Wrench } from 'lucide-react';

/**
 * Expandable component for Level 3 research / technical disclosure.
 * Keeps advanced formulas, seeds, split parameters, and definitions easily accessible without cluttering the primary user view.
 */
const TechnicalDetails = ({
  title = 'Technical details & methodology',
  subtitle = 'Formulas, split configurations, and research provenance',
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden transition-all duration-200 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-400">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-300 block">{title}</span>
            {subtitle && <span className="text-[11px] text-slate-500 block">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span>{isOpen ? 'Hide' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-3 border-t border-slate-800/60 text-xs text-slate-300 font-sans space-y-3 bg-slate-950/80">
          {children}
        </div>
      )}
    </div>
  );
};

export default TechnicalDetails;
