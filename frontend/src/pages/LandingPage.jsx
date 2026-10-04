import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cpu, Lock, FileSearch, ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';

const LandingPage = () => {
  const steps = [
    { num: '01', title: 'Proxy Capacity', desc: 'Evaluates mutual information & feature associations predicting sensitive attributes.' },
    { num: '02', title: 'Proxy Use', desc: 'Measures model reliance on candidate proxies using SHAP feature importance & dependence.' },
    { num: '03', title: 'Fairness Impact', desc: 'Assesses group fairness disparities (Demographic Parity, Disparate Impact, Equalized Odds).' },
    { num: '04', title: 'Proxy Intervention', desc: 'Simulates feature ablation and mitigation techniques to eliminate proxy bias reliance.' },
    { num: '05', title: 'Fairness–Utility Trade-off', desc: 'Quantifies predictive accuracy retention versus disparity reduction across models.' },
    { num: '06', title: 'Human Review', desc: 'Generates structured audit evidence for domain expert review and deployment decisions.' },
  ];

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Offline AI Auditing & Decision-Support Framework</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Detect and Mitigate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400">Proxy Bias</span> in AI Systems
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          A rigorous, offline auditing framework for supervised machine learning on structured datasets. Evaluate feature proxy capacity, model reliance, fairness impact, and intervention trade-offs.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/dashboard">
            <Button size="lg" icon={ArrowRight}>
              Open Audit Dashboard
            </Button>
          </Link>
          <Link to="/upload">
            <Button variant="outline" size="lg" icon={FileSearch}>
              Upload Dataset
            </Button>
          </Link>
        </div>
      </section>

      {/* Methodology Pipeline */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Core Research Methodology</h2>
          <p className="text-xs font-mono text-cyan-400 mt-1 uppercase tracking-wider">Strict 6-Stage Auditing Pipeline</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step) => (
            <Card key={step.num} className="hover:border-cyan-500/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  Stage {step.num}
                </span>
                <Layers className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-200 text-base mb-1">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Security & Offline Features */}
      <section className="glass-panel p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Offline Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Operates fully offline. Sensitive data stays within your local environment without external API calls.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Decoupled ML Service</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Python FastAPI backend handles analytical calculations, SHAP explainability, and Fairlearn evaluation independently.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Human Decision Support</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides comprehensive empirical evidence for auditor review without arbitrary or black-box fairness scores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
