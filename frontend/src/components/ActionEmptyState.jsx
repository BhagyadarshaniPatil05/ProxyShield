import React from 'react';
import { Play, Info, Sparkles, ArrowRight } from 'lucide-react';
import Button from './Button';

/**
 * Action-oriented empty state for analysis phases that haven't been run yet.
 * Explains:
 * 1. What will be analyzed
 * 2. Why this matters
 * 3. Clear direct action button
 */
const ActionEmptyState = ({
  title,
  subtitle,
  whatItDoes,
  whyItMatters,
  buttonText,
  buttonIcon: ButtonIcon = Play,
  onAction,
  loading = false,
  error = null,
  badge = 'Not analyzed yet',
  disabled = false,
  children
}) => {
  return (
    <div className="p-6 md:p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950/80 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block mb-2">
            {badge}
          </span>
          <h3 className="text-lg font-bold text-slate-100 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>What this analysis does</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{whatItDoes}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Info className="w-4 h-4" />
            <span>Why this matters</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{whyItMatters}</p>
        </div>
      </div>

      {children}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-[11px] text-slate-500">
          Click below to initiate analysis on this dataset.
        </div>
        <Button
          onClick={onAction}
          disabled={disabled || loading}
          icon={ButtonIcon}
          className="shadow-lg shadow-cyan-500/10"
        >
          {loading ? 'Running Analysis...' : buttonText}
        </Button>
      </div>
    </div>
  );
};

export default ActionEmptyState;
