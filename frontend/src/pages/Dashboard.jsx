import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Database, FileCheck2, AlertCircle, Plus, RefreshCw, Cpu, Server, Table, Sliders, Scale } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import { checkBackendHealth, checkMlHealth, getDatasets, getAllAudits } from '../services/api';

const Dashboard = ({ backendConnected, setBackendConnected, mlConnected, setMlConnected }) => {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [audits, setAudits] = useState([]);
  const [fetchingAudits, setFetchingAudits] = useState(true);

  const fetchHealthStatus = async () => {
    setLoading(true);
    try {
      await checkBackendHealth();
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }

    try {
      await checkMlHealth();
      setMlConnected(true);
    } catch {
      setMlConnected(false);
    }
    setLoading(false);
    setLastCheck(new Date().toLocaleTimeString());
  };

  const loadData = async () => {
    setFetchingAudits(true);
    try {
      const [dsRes, auditRes] = await Promise.all([
        getDatasets().catch(() => ({ datasets: [] })),
        getAllAudits().catch(() => ({ audits: [] }))
      ]);

      if (dsRes.success && Array.isArray(dsRes.datasets)) {
        setDatasets(dsRes.datasets);
      }
      if (auditRes.success && Array.isArray(auditRes.audits)) {
        setAudits(auditRes.audits);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading dashboard data:', err.message);
    } finally {
      setFetchingAudits(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Audit Dashboard"
        description="Monitor system services, dataset inventory, and baseline model fairness audits."
        badge="System Monitor"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                fetchHealthStatus();
                loadData();
              }}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Refresh'}
            </Button>
            <Link to="/audit/new">
              <Button size="sm" icon={Plus}>
                Configure Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Health Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between ${backendConnected ? 'bg-slate-900/80 border-slate-800' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${backendConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Node.js Express Backend</h4>
              <p className="text-xs text-slate-400">Port 5000 | Core API & Local Storage</p>
            </div>
          </div>
          <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full ${backendConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
            {backendConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${mlConnected ? 'bg-slate-900/80 border-slate-800' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mlConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Python FastAPI ML Service</h4>
              <p className="text-xs text-slate-400">Port 8000 | Fairness Analytics Engine</p>
            </div>
          </div>
          <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full ${mlConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
            {mlConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Managed Datasets</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {datasets.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Uploaded CSV files</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Audits</span>
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {audits.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Configured in MongoDB</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Fairness Analyzed</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {audits.filter(a => a.status === 'FAIRNESS_ANALYSIS_COMPLETED').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">DPD, DI, EOD & EqOdds</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Current Pipeline</span>
            <Table className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">Phase 4</div>
          <p className="text-[11px] text-slate-500 mt-1">Baseline Fairness Analysis</p>
        </Card>
      </div>

      {/* Audits Table */}
      <Card
        title="Managed Audit Tasks"
        subtitle="Supervised ML models evaluated for predictive performance and group fairness disparities"
        action={
          <Link to="/audit/new">
            <Button size="sm" variant="outline" icon={Plus}>
              New Baseline Audit
            </Button>
          </Link>
        }
      >
        {fetchingAudits ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            Loading audits from MongoDB...
          </div>
        ) : audits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Dataset</th>
                  <th className="py-3 px-4">Model Type</th>
                  <th className="py-3 px-4">Target ($Y$)</th>
                  <th className="py-3 px-4">Protected ($A$)</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Demographic Parity Diff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {audits.map((audit) => (
                  <tr key={audit._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {audit.datasetId?.name || 'Dataset'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {audit.modelType?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">{audit.targetAttribute}</td>
                    <td className="py-3 px-4 text-indigo-400">{audit.protectedAttribute}</td>
                    <td className="py-3 px-4 text-slate-200">
                      {audit.baselineResult?.accuracy
                        ? (audit.baselineResult.accuracy * 100).toFixed(1) + '%'
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-amber-400">
                      {audit.fairnessResult?.metrics?.demographicParityDifference !== undefined
                        ? audit.fairnessResult.metrics.demographicParityDifference
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          audit.status === 'REPORT_GENERATED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold'
                            : audit.status === 'FAIRNESS_UTILITY_COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : audit.status === 'BEFORE_AFTER_COMPLETED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : audit.status === 'MITIGATED_MODEL_COMPLETED'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                            : audit.status === 'INTERVENTION_COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : audit.status === 'FAIRNESS_IMPACT_COMPLETED'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                            : audit.status === 'ABLATION_COMPLETED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : audit.status === 'PROXY_USE_COMPLETED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : audit.status === 'PROXY_CAPACITY_COMPLETED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : audit.status === 'FAIRNESS_ANALYSIS_COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : audit.status === 'BASELINE_COMPLETED'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : audit.status === 'REPORT_GENERATING' || audit.status === 'FAIRNESS_UTILITY_RUNNING' || audit.status === 'BEFORE_AFTER_RUNNING' || audit.status === 'MITIGATED_MODEL_RUNNING' || audit.status === 'INTERVENTION_RUNNING' || audit.status === 'FAIRNESS_IMPACT_RUNNING' || audit.status === 'ABLATION_RUNNING' || audit.status === 'PROXY_USE_RUNNING' || audit.status === 'PROXY_CAPACITY_RUNNING' || audit.status === 'FAIRNESS_ANALYSIS_RUNNING' || audit.status === 'TRAINING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {audit.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/audit/${audit._id || audit.id}/results`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium underline text-[11px]"
                      >
                        View Results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <Sliders className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No baseline model audits created yet.</p>
            <Link to="/audit/new" className="inline-block mt-2">
              <Button size="sm" icon={Plus}>
                Configure First Audit
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
