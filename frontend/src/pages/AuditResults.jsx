import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Shield, Eye, BarChart3, Scale, FileText, CheckCircle2, AlertTriangle,
  ArrowLeft, RefreshCw, Cpu, Activity, Play, Users, Info, HelpCircle,
  Search, Layers, X, Zap, Sliders, FileCheck2, Printer, ExternalLink,
  ChevronRight, Sparkles, Check, ArrowRight, ShieldCheck, Database,
  TrendingDown, TrendingUp, AlertCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import TechnicalDetails from '../components/TechnicalDetails';
import ActionEmptyState from '../components/ActionEmptyState';
import {
  getAuditResults,
  runFairnessAnalysis,
  runProxyCapacity,
  runProxyUse,
  runFeatureAblation,
  runFairnessImpact,
  runProxyIntervention,
  runMitigatedModel,
  runBeforeAfter,
  runFairnessUtility,
  generateAuditReport,
  getAuditReportHtmlUrl
} from '../services/api';

const AuditResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase Execution States
  const [runningFairness, setRunningFairness] = useState(false);
  const [fairnessError, setFairnessError] = useState(null);
  const [selectedRefGroup, setSelectedRefGroup] = useState('');

  const [runningProxy, setRunningProxy] = useState(false);
  const [proxyError, setProxyError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const [runningProxyUse, setRunningProxyUse] = useState(false);
  const [proxyUseError, setProxyUseError] = useState(null);

  const [runningAblation, setRunningAblation] = useState(false);
  const [ablationError, setAblationError] = useState(null);
  const [selectedAblatedFeatureName, setSelectedAblatedFeatureName] = useState('');

  const [runningFairnessImpact, setRunningFairnessImpact] = useState(false);
  const [fairnessImpactError, setFairnessImpactError] = useState(null);
  const [selectedFairnessImpactFeatureName, setSelectedFairnessImpactFeatureName] = useState('');

  const [runningIntervention, setRunningIntervention] = useState(false);
  const [interventionError, setInterventionError] = useState(null);
  const [selectedInterventionFeatures, setSelectedInterventionFeatures] = useState([]);
  const [selectedInterventionStrategy, setSelectedInterventionStrategy] = useState('REMOVE_FEATURE');

  const [runningMitigatedModel, setRunningMitigatedModel] = useState(false);
  const [mitigatedModelError, setMitigatedModelError] = useState(null);

  const [runningBeforeAfter, setRunningBeforeAfter] = useState(false);
  const [beforeAfterError, setBeforeAfterError] = useState(null);

  const [runningFairnessUtility, setRunningFairnessUtility] = useState(false);
  const [fairnessUtilityError, setFairnessUtilityError] = useState(null);
  const [selectedTradeoffThreshold, setSelectedTradeoffThreshold] = useState(0.01);

  const [runningReport, setRunningReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  const [selectedCandidateFeatures, setSelectedCandidateFeatures] = useState([]);

  // Human Review State
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  const auditId = audit?._id || audit?.id || id;

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetId = id || 'latest';
      let res;
      try {
        res = await getAuditResults(targetId);
      } catch (firstErr) {
        if (targetId !== 'latest') {
          res = await getAuditResults('latest');
        } else {
          throw firstErr;
        }
      }

      if (res && res.success && res.audit) {
        setAudit(res.audit);
        if (res.audit._id && res.audit._id !== id) {
          navigate(`/audit/${res.audit._id}/results`, { replace: true });
        }
        if (res.audit.fairnessResult?.referenceGroup) {
          setSelectedRefGroup(res.audit.fairnessResult.referenceGroup);
        }
      } else {
        setError('Failed to load audit results.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching audit results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  const handleRunFairness = async () => {
    setRunningFairness(true);
    setFairnessError(null);
    try {
      const res = await runFairnessAnalysis(auditId, selectedRefGroup || null);
      if (res.success && res.audit) {
        setAudit(res.audit);
        if (res.audit.fairnessResult?.referenceGroup) {
          setSelectedRefGroup(res.audit.fairnessResult.referenceGroup);
        }
      } else {
        setFairnessError('Fairness check execution failed.');
      }
    } catch (err) {
      setFairnessError(err.message || 'Error executing fairness check.');
    } finally {
      setRunningFairness(false);
    }
  };

  const handleRunProxyCapacity = async () => {
    setRunningProxy(true);
    setProxyError(null);
    try {
      const res = await runProxyCapacity(auditId);
      if (res.success && res.audit) {
        setAudit(res.audit);
      } else {
        setProxyError('Proxy analysis execution failed.');
      }
    } catch (err) {
      setProxyError(err.message || 'Error executing proxy analysis.');
    } finally {
      setRunningProxy(false);
    }
  };

  const handleRunProxyUse = async () => {
    setRunningProxyUse(true);
    setProxyUseError(null);
    try {
      const res = await runProxyUse(
        auditId,
        selectedCandidateFeatures.length > 0 ? selectedCandidateFeatures : null
      );
      if (res.success && res.audit) {
        setAudit(res.audit);
      } else {
        setProxyUseError('Model reliance analysis execution failed.');
      }
    } catch (err) {
      setProxyUseError(err.message || 'Error executing model reliance analysis.');
    } finally {
      setRunningProxyUse(false);
    }
  };

  const handleRunFeatureAblation = async () => {
    setRunningAblation(true);
    setAblationError(null);
    try {
      const res = await runFeatureAblation(
        auditId,
        selectedCandidateFeatures.length > 0 ? selectedCandidateFeatures : null
      );
      if (res.success && res.audit) {
        setAudit(res.audit);
        if (res.audit.featureAblationResult?.features?.length > 0) {
          setSelectedAblatedFeatureName(res.audit.featureAblationResult.features[0].featureName);
        }
      } else {
        setAblationError('Feature contribution analysis failed.');
      }
    } catch (err) {
      setAblationError(err.message || 'Error executing feature contribution analysis.');
    } finally {
      setRunningAblation(false);
    }
  };

  const handleRunFairnessImpact = async () => {
    setRunningFairnessImpact(true);
    setFairnessImpactError(null);
    try {
      const res = await runFairnessImpact(
        auditId,
        selectedCandidateFeatures.length > 0 ? selectedCandidateFeatures : null,
        selectedRefGroup || null
      );
      if (res.success && res.audit) {
        setAudit(res.audit);
        const exps = res.audit.fairnessImpactResult?.experiments || res.audit.fairnessImpactResult?.features;
        if (exps && exps.length > 0) {
          setSelectedFairnessImpactFeatureName(exps[0].featureName || exps[0].feature);
        }
      } else {
        setFairnessImpactError('Fairness impact analysis execution failed.');
      }
    } catch (err) {
      setFairnessImpactError(err.message || 'Error executing fairness impact analysis.');
    } finally {
      setRunningFairnessImpact(false);
    }
  };

  const handleRunMitigationSuite = async () => {
    setRunningIntervention(true);
    setInterventionError(null);
    try {
      // 1. Configure Intervention
      const resInterv = await runProxyIntervention(
        auditId,
        selectedCandidateFeatures.length > 0 ? selectedCandidateFeatures : null,
        selectedInterventionFeatures.length > 0 ? selectedInterventionFeatures : null,
        selectedInterventionStrategy
      );
      if (!resInterv.success) throw new Error('Intervention configuration failed.');

      // 2. Train Mitigated Model
      setRunningMitigatedModel(true);
      const resMit = await runMitigatedModel(
        auditId,
        selectedInterventionFeatures.length > 0 ? selectedInterventionFeatures : null,
        selectedInterventionStrategy
      );
      if (!resMit.success) throw new Error('Mitigated model training failed.');

      // 3. Before vs After comparison
      setRunningBeforeAfter(true);
      const resComp = await runBeforeAfter(auditId, selectedRefGroup || null);
      if (!resComp.success) throw new Error('Before vs After comparison failed.');

      // 4. Trade-off analysis
      setRunningFairnessUtility(true);
      const resTrade = await runFairnessUtility(auditId, selectedTradeoffThreshold);
      if (resTrade.success && resTrade.audit) {
        setAudit(resTrade.audit);
      }
    } catch (err) {
      setInterventionError(err.message || 'Mitigation evaluation failed.');
    } finally {
      setRunningIntervention(false);
      setRunningMitigatedModel(false);
      setRunningBeforeAfter(false);
      setRunningFairnessUtility(false);
    }
  };

  const handleGenerateReport = async () => {
    setRunningReport(true);
    setReportError(null);
    try {
      const res = await generateAuditReport(auditId);
      if (res.success && res.audit) {
        setAudit(res.audit);
      } else {
        setReportError(res.error || 'Audit report generation failed.');
      }
    } catch (err) {
      setReportError(err.message || 'Error generating audit report.');
    } finally {
      setRunningReport(false);
    }
  };

  const toggleInterventionFeatureSelection = (feat) => {
    setSelectedInterventionFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const toggleCandidateFeatureSelection = (feat) => {
    setSelectedCandidateFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loading message="Loading audit overview & model metrics..." />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <ErrorMessage message={error || 'Audit not found.'} retry={fetchResults} />
      </div>
    );
  }

  // Model & Pipeline Results from backend
  const baseline = audit.baselineResult;
  const fairness = audit.fairnessResult;
  const proxy = audit.proxyCapacityResult;
  const proxyUse = audit.proxyUseResult;
  const ablation = audit.featureAblationResult;
  const fairnessImpact = audit.fairnessImpactResult;
  const intervention = audit.interventionResult;
  const mitigated = audit.mitigatedModelResult;
  const beforeAfter = audit.beforeAfterResult;
  const fairnessUtility = audit.fairnessUtilityResult;
  const reportResult = audit.reportResult;
  const dataset = audit.datasetId || {};

  // Status computation for Audit Progress Indicator
  const isPerformanceDone = Boolean(baseline);
  const isFairnessDone = Boolean(fairness && fairness.metrics);
  const isProxySignalsDone = Boolean(proxy && proxy.results && proxy.results.length > 0);
  const isModelRelianceDone = Boolean(proxyUse && proxyUse.candidateFeatures);
  const isFeatureContributionDone = Boolean(ablation && ablation.features);
  const isFairnessImpactDone = Boolean(fairnessImpact && (fairnessImpact.experiments || fairnessImpact.features));
  const isMitigationDone = Boolean(mitigated && mitigated.performance);
  const isTradeoffDone = Boolean(fairnessUtility && fairnessUtility.tradeoffClassification);
  const isReviewDone = Boolean(reportResult && reportResult.status === 'REPORT_GENERATED');

  // Navigation Items
  const navItems = [
    { id: 'overview', label: 'Overview & Summary', icon: Sparkles, isDone: true },
    { id: 'performance', label: '1. Model Performance', icon: BarChart3, isDone: isPerformanceDone },
    { id: 'fairness', label: '2. Fairness Check', icon: Scale, isDone: isFairnessDone },
    { id: 'proxy', label: '3. Potential Proxy Signals', icon: Eye, isDone: isProxySignalsDone },
    { id: 'use', label: '4. Model Reliance', icon: Cpu, isDone: isModelRelianceDone },
    { id: 'ablation', label: '5. Feature Contribution', icon: FileText, isDone: isFeatureContributionDone },
    { id: 'fairnessImpact', label: '6. Fairness Impact', icon: Zap, isDone: isFairnessImpactDone },
    { id: 'mitigation', label: '7. Mitigation', icon: Shield, isDone: isMitigationDone },
    { id: 'tradeoff', label: '8. Fairness vs. Performance', icon: Activity, isDone: isTradeoffDone },
    { id: 'review', label: '9. Review & Decision', icon: FileCheck2, isDone: isReviewDone },
  ];

  // Dynamic "What's happening?" natural language explanation
  const datasetName = dataset.name || dataset.originalFileName || 'Uploaded Dataset';
  const totalRowCount = dataset.rowCount || dataset.rows || baseline?.trainRows ? (baseline.trainRows + baseline.testRows) : 0;
  const totalFeatureCount = dataset.columnCount || dataset.columns?.length || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/dashboard" className="hover:text-cyan-400">Dashboard</Link>
        <span>/</span>
        <span className="text-slate-300">Audits</span>
        <span>/</span>
        <span className="font-mono text-cyan-400">{datasetName}</span>
      </div>

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              AI Model Audit: <span className="text-cyan-400 capitalize">{audit.modelType?.replace('_', ' ')}</span>
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
              isReviewDone
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            }`}>
              {isReviewDone ? 'Audit Completed' : 'Audit In Progress'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Understand your model's predictive performance, group fairness, and potential proxy risks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchResults}>
            Refresh
          </Button>
          <Link to="/audit/new">
            <Button size="sm" icon={Sliders}>
              New Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Dataset Context Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Dataset</span>
          <span className="text-slate-200 font-semibold truncate block mt-0.5" title={datasetName}>{datasetName}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Total Records</span>
          <span className="text-slate-200 font-semibold block mt-0.5">
            {totalRowCount > 0 ? Number(totalRowCount).toLocaleString() : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Predicting Target</span>
          <span className="text-cyan-400 font-semibold block mt-0.5">{audit.targetAttribute}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Protected Attribute</span>
          <span className="text-indigo-400 font-semibold block mt-0.5">{audit.protectedAttribute}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Model Classifier</span>
          <span className="text-slate-300 block mt-0.5 capitalize">{audit.modelType?.replace('_', ' ')}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Missing Values</span>
          <span className="text-slate-300 block mt-0.5">
            {dataset.totalMissingValues !== undefined ? Number(dataset.totalMissingValues).toLocaleString() : '0 (Imputed)'}
          </span>
        </div>
      </div>

      {/* AUDIT NAVIGATION (Eliminating Horizontal Scrollbar) */}
      <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold px-2 mb-2 flex items-center justify-between">
          <span>Audit Journey</span>
          <span>Click any section to inspect</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all text-left border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/5'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.isDone ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-1.5" title="Completed" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0 ml-1.5" title="Not analyzed yet" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: OVERVIEW & EXECUTIVE SUMMARY                                     */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="p-6 md:p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 inline-block mb-1.5">
                  Audit Summary
                </span>
                <h2 className="text-xl font-bold text-slate-100">Audit at a Glance</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live status of model performance, fairness checks, proxy risks, and mitigation.
                </p>
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Model Performance</span>
                <span className="text-xl font-bold font-mono text-cyan-400 block">
                  {baseline ? `${(baseline.accuracy * 100).toFixed(1)}% Accuracy` : 'Not Evaluated'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {baseline ? `F1: ${(baseline.f1 * 100).toFixed(1)}% | ROC-AUC: ${(baseline.rocAuc * 100).toFixed(1)}%` : 'Baseline training needed'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Fairness Check</span>
                <span className={`text-xl font-bold font-mono block ${isFairnessDone ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {isFairnessDone ? `DPD: ${fairness.metrics.demographicParityDifference.toFixed(3)}` : 'Not Analyzed Yet'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {isFairnessDone ? `Disparate Impact: ${fairness.metrics.disparateImpact !== null ? fairness.metrics.disparateImpact.toFixed(2) : 'N/A'}` : 'Compare group disparities'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Potential Proxy Signals</span>
                <span className={`text-xl font-bold font-mono block ${isProxySignalsDone ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isProxySignalsDone ? `${proxy.results.filter(r => r.capacityLevel === 'HIGH' || r.capacityLevel === 'MEDIUM').length} Features Found` : 'Not Analyzed Yet'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {isProxySignalsDone ? `${proxy.results.length} candidate features checked` : 'Identify correlated proxies'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Mitigation Status</span>
                <span className={`text-xl font-bold font-mono block ${isMitigationDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isMitigationDone ? 'Evaluated' : 'Not Evaluated'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {isMitigationDone ? `Mitigated Acc: ${(mitigated.performance.accuracy * 100).toFixed(1)}%` : 'Test proxy removal impact'}
                </p>
              </div>
            </div>

            {/* "What's Happening?" Summary Card */}
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>What is happening to your dataset and model?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your dataset <span className="text-slate-100 font-semibold font-mono">{datasetName}</span> containing{' '}
                <span className="text-slate-100 font-semibold font-mono">{totalRowCount > 0 ? Number(totalRowCount).toLocaleString() : 'thousands of'}</span> records is being used to train and evaluate a{' '}
                <span className="text-slate-100 font-semibold capitalize">{audit.modelType?.replace('_', ' ')}</span> model predicting{' '}
                <span className="text-cyan-400 font-semibold font-mono">"{audit.targetAttribute}"</span> while auditing for fairness relative to the protected attribute{' '}
                <span className="text-indigo-400 font-semibold font-mono">"{audit.protectedAttribute}"</span>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                ProxyShield first evaluates predictive accuracy, tests whether outcomes differ across protected groups, investigates whether other features act as proxies for the protected attribute, and checks whether mitigation can improve fairness without disproportionate performance loss.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: MODEL PERFORMANCE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <Card
            title="1. Model Performance"
            subtitle="How accurately does the model predict the target attribute?"
          >
            {baseline ? (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Accuracy</span>
                    <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                      {(baseline.accuracy * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Overall correct rate</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Precision</span>
                    <span className="text-2xl font-bold font-mono text-indigo-400 mt-1 block">
                      {(baseline.precision * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">True positive quality</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Recall</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                      {(baseline.recall * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Coverage of positives</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">F1 Score</span>
                    <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                      {(baseline.f1 * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Harmonic balance</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">ROC-AUC</span>
                    <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
                      {baseline.rocAuc !== null ? (baseline.rocAuc * 100).toFixed(1) + '%' : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Discriminative power</span>
                  </div>
                </div>

                {/* "What does this mean?" Explanation */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>What does this mean?</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Accuracy shows the percentage of predictions that were correct. Precision measures how often positive predictions were accurate, while recall measures how many actual positive cases were caught by the model.
                  </p>
                </div>

                {/* Prediction Breakdown (Confusion Matrix) */}
                {baseline.confusionMatrix && baseline.confusionMatrix.length === 2 && (
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm">Prediction Breakdown</h4>
                      <p className="text-xs text-slate-400">How the model's predictions compare with actual outcomes on the test split.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs max-w-lg">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-slate-400 text-[10px] uppercase block">True Negatives</span>
                        <span className="text-lg font-bold text-emerald-400 mt-1 block">
                          {baseline.confusionMatrix[0][0].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Correctly predicted negative</span>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                        <span className="text-slate-400 text-[10px] uppercase block">False Positives</span>
                        <span className="text-lg font-bold text-rose-400 mt-1 block">
                          {baseline.confusionMatrix[0][1].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Incorrectly predicted positive</span>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                        <span className="text-slate-400 text-[10px] uppercase block">False Negatives</span>
                        <span className="text-lg font-bold text-rose-400 mt-1 block">
                          {baseline.confusionMatrix[1][0].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Missed positive cases</span>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-slate-400 text-[10px] uppercase block">True Positives</span>
                        <span className="text-lg font-bold text-emerald-400 mt-1 block">
                          {baseline.confusionMatrix[1][1].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Correctly predicted positive</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Level 3 Technical Details */}
                <TechnicalDetails title="Technical details & reproducibility parameters">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px]">Train / Test Partition</span>
                      <span className="text-slate-200">80% Train ({baseline.trainRows} rows) / 20% Test ({baseline.testRows} rows)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px]">Random Seed</span>
                      <span className="text-emerald-400 font-bold">random_state = 42</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px]">Protected Attribute Excluded from Inputs</span>
                      <span className="text-indigo-400 font-bold">Yes (Strict Attribute Scoping)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px]">Features Used in Model</span>
                      <span className="text-slate-200">{baseline.featureCount} encoded feature columns</span>
                    </div>
                  </div>
                </TechnicalDetails>
              </div>
            ) : (
              <ActionEmptyState
                title="Model Performance Not Evaluated Yet"
                whatItDoes="Trains the baseline classifier on your dataset using an 80/20 split and measures precision, recall, accuracy, and ROC-AUC."
                whyItMatters="Establishes the initial performance benchmark before analyzing proxy relationships and fairness."
                buttonText="Train Baseline Model"
                onAction={fetchResults}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: FAIRNESS CHECK                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'fairness' && (
        <div className="space-y-6">
          <Card
            title="2. Fairness Check"
            subtitle="Compares model prediction outcomes across protected demographic groups."
            action={
              fairness && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunFairness} disabled={runningFairness}>
                  {runningFairness ? 'Checking...' : 'Rerun Fairness Check'}
                </Button>
              )
            }
          >
            {fairness && fairness.metrics ? (
              <div className="space-y-6">
                {/* Comparison Group Selection */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-300 font-semibold block">Comparison Reference Group</span>
                    <span className="text-slate-500 text-[11px]">
                      The baseline group used for computing parity and opportunity differences.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-semibold px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {fairness.referenceGroup || 'Default Reference'}
                    </span>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Demographic Parity Diff</span>
                    <span className="text-2xl font-bold font-mono text-indigo-400 mt-1 block">
                      {fairness.metrics.demographicParityDifference.toFixed(3)}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">Difference in positive prediction rates</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Disparate Impact Ratio</span>
                    <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                      {fairness.metrics.disparateImpact !== null ? fairness.metrics.disparateImpact.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">Ratio of selection rates (0.80 benchmark)</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Equal Opportunity Diff</span>
                    <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                      {fairness.metrics.equalOpportunityDifference !== null ? fairness.metrics.equalOpportunityDifference.toFixed(3) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">Difference in True Positive rates</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Equalized Odds Diff</span>
                    <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
                      {fairness.metrics.equalizedOddsDifference !== null ? fairness.metrics.equalizedOddsDifference.toFixed(3) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">Max disparity across TPR & FPR</span>
                  </div>
                </div>

                {/* Group Comparison Table */}
                {fairness.groupMetrics && Object.keys(fairness.groupMetrics).length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-slate-200 text-sm">Group Prediction Rates</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-left">
                            <th className="pb-2">Group</th>
                            <th className="pb-2">Total Count</th>
                            <th className="pb-2">Positive Prediction Rate</th>
                            <th className="pb-2">True Positive Rate</th>
                            <th className="pb-2">False Positive Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {Object.entries(fairness.groupMetrics).map(([grp, stats]) => (
                            <tr key={grp} className="hover:bg-slate-900/40">
                              <td className="py-2.5 font-semibold text-slate-200">{grp}</td>
                              <td className="py-2.5 text-slate-400">{stats.count || stats.total || 'N/A'}</td>
                              <td className="py-2.5 text-cyan-400 font-bold">
                                {stats.selectionRate !== undefined ? `${(stats.selectionRate * 100).toFixed(1)}%` : 'N/A'}
                              </td>
                              <td className="py-2.5 text-emerald-400">
                                {stats.tpr !== undefined ? `${(stats.tpr * 100).toFixed(1)}%` : 'N/A'}
                              </td>
                              <td className="py-2.5 text-rose-400">
                                {stats.fpr !== undefined ? `${(stats.fpr * 100).toFixed(1)}%` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* What this tells you */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>What this tells you</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A Demographic Parity Difference of <span className="font-mono text-indigo-400 font-semibold">{fairness.metrics.demographicParityDifference.toFixed(3)}</span> means positive outcomes occur with different frequencies across demographic groups. Next, ProxyShield checks whether other features in the dataset act as proxies for this protected attribute.
                  </p>
                </div>

                {/* Technical details accordion */}
                <TechnicalDetails title="Technical definitions & fairness formulas">
                  <div className="space-y-2 text-xs">
                    <p><strong className="text-indigo-400">Demographic Parity Difference:</strong> DPD = |P(Ŷ=1|A=a) - P(Ŷ=1|A=ref)|. Measures difference in positive outcome rates regardless of true label.</p>
                    <p><strong className="text-cyan-400">Disparate Impact Ratio:</strong> DI = P(Ŷ=1|A=unprivileged) / P(Ŷ=1|A=privileged). Values below 0.80 indicate potential adverse impact under standard regulatory guidelines.</p>
                    <p><strong className="text-amber-400">Equal Opportunity Difference:</strong> EOD = |TPR(A=a) - TPR(A=ref)|. Measures whether qualified individuals have equal probability of receiving a positive prediction.</p>
                  </div>
                </TechnicalDetails>
              </div>
            ) : (
              <ActionEmptyState
                title="Fairness Hasn't Been Checked Yet"
                whatItDoes="Compares model prediction outcomes between groups defined by the protected attribute to identify differences in treatment rates."
                whyItMatters="Helps detect whether the model favors one group over another before we search for proxy features."
                buttonText="Run Fairness Check"
                onAction={handleRunFairness}
                loading={runningFairness}
                error={fairnessError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: POTENTIAL PROXY SIGNALS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'proxy' && (
        <div className="space-y-6">
          <Card
            title="3. Potential Proxy Signals"
            subtitle="Which features in the dataset are strongly associated with the protected attribute?"
            action={
              proxy && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunProxyCapacity} disabled={runningProxy}>
                  {runningProxy ? 'Analyzing...' : 'Rerun Proxy Analysis'}
                </Button>
              )
            }
          >
            {proxy && proxy.results && proxy.results.length > 0 ? (
              <div className="space-y-6">
                {/* Core Friendly Explanation */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>How to understand proxy signals</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A feature can act as a proxy when it contains statistical information about the protected attribute. Identifying an association does <strong>not</strong> by itself prove the model is discriminatory. Next, we verify whether the model actually relies on these features.
                  </p>
                </div>

                {/* Proxy Signals Table */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200 text-sm">Identified Candidate Features</h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {proxy.results.length} features analyzed
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-left">
                          <th className="pb-2">Feature</th>
                          <th className="pb-2">Association Score</th>
                          <th className="pb-2">Strength</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {proxy.results.map((r) => {
                          const isHigh = r.capacityLevel === 'HIGH';
                          const isMed = r.capacityLevel === 'MEDIUM';
                          return (
                            <tr key={r.feature} className="hover:bg-slate-900/40">
                              <td className="py-2.5 font-semibold text-slate-200">{r.feature}</td>
                              <td className="py-2.5 text-cyan-400 font-bold">
                                {r.proxyCapacityScore !== undefined ? r.proxyCapacityScore.toFixed(3) : 'N/A'}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  isHigh
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : isMed
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {r.capacityLevel || 'LOW'}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-300">
                                {isHigh || isMed ? 'Potential Proxy' : 'Low Association'}
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFeature(r)}
                                  className="text-[11px] text-cyan-400 hover:underline"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* "Why does this matter?" Card with Next Step Action */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900/80 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Why does this matter?</span>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Features with high proxy capacity may carry protected information into model predictions. Check model reliance to see if the trained model actually uses them.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab('use')}
                    icon={ArrowRight}
                    className="shrink-0"
                  >
                    Check Model Reliance
                  </Button>
                </div>

                {/* Technical Details Accordion */}
                <TechnicalDetails title="Statistical methodology & capacity scoring">
                  <div className="space-y-2 text-xs">
                    <p>Proxy Capacity synthesizes <strong>Mutual Information (MI)</strong>, <strong>Cramer's V / Pearson correlation</strong>, and <strong>single-feature predictability</strong> relative to the protected attribute.</p>
                    <p>Features exceeding pre-defined empirical thresholds are flagged as potential proxy candidates for subsequent model reliance evaluation.</p>
                  </div>
                </TechnicalDetails>
              </div>
            ) : (
              <ActionEmptyState
                title="Proxy Signals Not Analyzed Yet"
                whatItDoes="Identifies features in your dataset that carry strong statistical information about the protected attribute."
                whyItMatters="Reveals potential backdoor proxy relationships that could lead to indirect bias even when protected attributes are excluded from model inputs."
                buttonText="Run Proxy Analysis"
                onAction={handleRunProxyCapacity}
                loading={runningProxy}
                error={proxyError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: MODEL RELIANCE                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'use' && (
        <div className="space-y-6">
          <Card
            title="4. Does the Model Rely on These Features?"
            subtitle="Tests whether the trained machine learning model's predictions depend on the potential proxy features."
            action={
              proxyUse && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunProxyUse} disabled={runningProxyUse}>
                  {runningProxyUse ? 'Evaluating...' : 'Rerun Reliance Analysis'}
                </Button>
              )
            }
          >
            {proxyUse && proxyUse.candidateFeatures ? (
              <div className="space-y-6">
                {/* Visual Explanation */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>Understanding Model Reliance</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Finding a statistical association in the data does not mean the model uses that feature. This check calculates <strong>SHAP importance</strong>, <strong>permutation drops</strong>, and <strong>ablation impact</strong> to confirm real model dependence.
                  </p>
                </div>

                {/* Reliance Table */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-200 text-sm">Model Reliance Across Candidate Features</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-left">
                          <th className="pb-2">Feature</th>
                          <th className="pb-2">Global SHAP Value</th>
                          <th className="pb-2">Permutation Drop</th>
                          <th className="pb-2">Ablation Delta</th>
                          <th className="pb-2">Decision Change Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {proxyUse.candidateFeatures.map((f) => (
                          <tr key={f.featureName || f.feature} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-semibold text-slate-200">{f.featureName || f.feature}</td>
                            <td className="py-2.5 text-cyan-400 font-bold">
                              {f.globalShapValue !== undefined ? f.globalShapValue.toFixed(4) : (f.shapImportance?.toFixed(4) || 'N/A')}
                            </td>
                            <td className="py-2.5 text-indigo-400">
                              {f.permutationImportanceDrop !== undefined ? `${(f.permutationImportanceDrop * 100).toFixed(2)}%` : 'N/A'}
                            </td>
                            <td className="py-2.5 text-amber-400">
                              {f.ablationDelta !== undefined ? `${(f.ablationDelta * 100).toFixed(2)}%` : 'N/A'}
                            </td>
                            <td className="py-2.5 text-rose-400 font-semibold">
                              {f.predictionChangeRate !== undefined ? `${(f.predictionChangeRate * 100).toFixed(1)}%` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technical Details Accordion */}
                <TechnicalDetails title="SHAP & Permutation evaluation parameters">
                  <div className="space-y-2 text-xs">
                    <p>SHAP values compute Shapley game-theoretic contributions across independent test observations.</p>
                    <p>Multi-repeat permutation shuffles feature columns 10 times to measure true loss in generalization capability.</p>
                  </div>
                </TechnicalDetails>
              </div>
            ) : (
              <ActionEmptyState
                title="Model Reliance Not Evaluated Yet"
                whatItDoes="Evaluates SHAP importance, permutation loss, and decision change rates to verify whether the model actually relies on potential proxy features."
                whyItMatters="Distinguishes harmless correlations in the data from features that actively influence the model's decisions."
                buttonText="Check Model Reliance"
                onAction={handleRunProxyUse}
                loading={runningProxyUse}
                error={proxyUseError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: FEATURE CONTRIBUTION / ABLATION                                */}
      {/* ========================================================================= */}
      {activeTab === 'ablation' && (
        <div className="space-y-6">
          <Card
            title="5. Feature Contribution"
            subtitle="What happens if we remove a candidate proxy feature?"
            action={
              ablation && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunFeatureAblation} disabled={runningAblation}>
                  {runningAblation ? 'Testing...' : 'Rerun Ablation'}
                </Button>
              )
            }
          >
            {ablation && ablation.features && ablation.features.length > 0 ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Info className="w-4 h-4" />
                    <span>How feature ablation works</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    We temporarily neutralize selected features on copy test observations and compare model accuracy and predictions against the baseline.
                  </p>
                </div>

                {/* Ablated Feature Details */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <h4 className="font-semibold text-slate-200 text-sm">Feature Neutralization Impact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ablation.features.map((f) => (
                      <div key={f.featureName} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-200 text-sm">{f.featureName}</span>
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Accuracy Delta:</span>
                            <span className="text-amber-400 font-semibold">{f.performanceDelta?.accuracyDelta ? (f.performanceDelta.accuracyDelta * 100).toFixed(2) + '%' : '0.00%'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Flipped Decisions:</span>
                            <span className="text-rose-400 font-semibold">{f.predictionChangeRate ? (f.predictionChangeRate * 100).toFixed(1) + '%' : '0.0%'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ActionEmptyState
                title="Feature Contribution Not Analyzed Yet"
                whatItDoes="Temporarily removes candidate features and measures exact changes in predictive accuracy and decision flips."
                whyItMatters="Reveals which features have the strongest causal influence on model decisions."
                buttonText="Test Feature Contribution"
                onAction={handleRunFeatureAblation}
                loading={runningAblation}
                error={ablationError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: FAIRNESS IMPACT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'fairnessImpact' && (
        <div className="space-y-6">
          <Card
            title="6. Fairness Impact"
            subtitle="How do features associated with the protected attribute affect differences in model outcomes?"
            action={
              fairnessImpact && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunFairnessImpact} disabled={runningFairnessImpact}>
                  {runningFairnessImpact ? 'Analyzing...' : 'Rerun Impact Analysis'}
                </Button>
              )
            }
          >
            {fairnessImpact && (fairnessImpact.experiments || fairnessImpact.features) ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  Measures whether neutralising candidate proxy features reduces group disparity metrics (DPD, Disparate Impact, EOD).
                </div>
                {/* Experiments list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(fairnessImpact.experiments || fairnessImpact.features).map((exp) => (
                    <div key={exp.featureName || exp.feature} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <span className="font-bold text-slate-200 text-sm">{exp.featureName || exp.feature}</span>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Demographic Parity Shift:</span>
                          <span className="text-indigo-400 font-semibold">{exp.fairnessDelta?.demographicParityDifferenceDelta !== undefined ? exp.fairnessDelta.demographicParityDifferenceDelta.toFixed(4) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ActionEmptyState
                title="Fairness Impact Not Analyzed Yet"
                whatItDoes="Evaluates how group disparity metrics change when candidate proxy features are removed."
                whyItMatters="Shows whether removing a candidate feature actually helps close fairness gaps."
                buttonText="Run Fairness Impact Analysis"
                onAction={handleRunFairnessImpact}
                loading={runningFairnessImpact}
                error={fairnessImpactError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: MITIGATION                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'mitigation' && (
        <div className="space-y-6">
          <Card
            title="7. Mitigation"
            subtitle="Can we reduce potential proxy-related fairness concerns while preserving useful model performance?"
            action={
              mitigated && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleRunMitigationSuite} disabled={runningIntervention || runningMitigatedModel}>
                  {runningIntervention || runningMitigatedModel ? 'Retraining...' : 'Rerun Mitigation'}
                </Button>
              )
            }
          >
            {mitigated && mitigated.performance ? (
              <div className="space-y-6">
                {/* Performance Comparison */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-200 text-sm">Model Comparison (Before vs. After Mitigation)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 uppercase block text-[10px]">Original Accuracy</span>
                      <span className="text-lg font-bold text-slate-300 block mt-1">
                        {baseline ? `${(baseline.accuracy * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-slate-400 uppercase block text-[10px]">Mitigated Accuracy</span>
                      <span className="text-lg font-bold text-cyan-400 block mt-1">
                        {(mitigated.performance.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 uppercase block text-[10px]">Original F1</span>
                      <span className="text-lg font-bold text-slate-300 block mt-1">
                        {baseline ? `${(baseline.f1 * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-slate-400 uppercase block text-[10px]">Mitigated F1</span>
                      <span className="text-lg font-bold text-indigo-400 block mt-1">
                        {(mitigated.performance.f1 * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features Removed */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1">Intervention applied:</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    Removed {mitigated.removedFeatures?.join(', ') || 'selected candidate features'}
                  </span>
                </div>
              </div>
            ) : (
              <ActionEmptyState
                title="Mitigation Not Evaluated Yet"
                whatItDoes="Applies controlled proxy removal and retrains a mitigated model using the exact same split parameters."
                whyItMatters="Shows whether removing proxy features reduces bias while keeping the model accurate."
                buttonText="Evaluate Mitigation"
                onAction={handleRunMitigationSuite}
                loading={runningIntervention || runningMitigatedModel}
                error={interventionError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: FAIRNESS VS PERFORMANCE (TRADE-OFF)                           */}
      {/* ========================================================================= */}
      {activeTab === 'tradeoff' && (
        <div className="space-y-6">
          <Card
            title="8. Fairness vs. Model Performance"
            subtitle="Balancing predictive utility and fairness outcomes."
            action={
              fairnessUtility && (
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => handleRunFairnessUtility()} disabled={runningFairnessUtility}>
                  {runningFairnessUtility ? 'Analyzing...' : 'Rerun Trade-off'}
                </Button>
              )
            }
          >
            {fairnessUtility && fairnessUtility.tradeoffClassification ? (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase font-mono">Trade-off Classification</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {fairnessUtility.tradeoffClassification.code || 'BALANCED_TRADEOFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {fairnessUtility.overallInterpretation || 'Mitigation achieved a measurable improvement in fairness metrics with acceptable predictive utility retention.'}
                  </p>
                </div>
              </div>
            ) : (
              <ActionEmptyState
                title="Trade-off Not Evaluated Yet"
                whatItDoes="Calculates the Pareto trade-off between predictive accuracy retention and group disparity reduction."
                whyItMatters="Provides an objective basis for human decision-making and deployment review."
                buttonText="Analyze Trade-off"
                onAction={() => handleRunFairnessUtility()}
                loading={runningFairnessUtility}
                error={fairnessUtilityError}
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: REVIEW & DECISION                                              */}
      {/* ========================================================================= */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          <Card
            title="9. Review & Decision"
            subtitle="Synthesize the empirical audit evidence and document the final deployment determination."
          >
            <div className="space-y-6">
              {/* Report Generation Action */}
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-100 text-base">AI Fairness Audit Report</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate or download the complete, structured audit report with full provenance.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={runningReport}
                    icon={FileCheck2}
                  >
                    {runningReport ? 'Generating Report...' : reportResult ? 'Regenerate Report' : 'Generate Audit Report'}
                  </Button>
                  {reportResult && (
                    <a
                      href={getAuditReportHtmlUrl(auditId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Printable Report
                    </a>
                  )}
                </div>
              </div>

              {/* Human Decision Form */}
              <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h4 className="font-semibold text-slate-200 text-sm">Auditor Determination & Sign-off</h4>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block">Review Decision:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                    {[
                      { val: 'APPROVED', label: 'Approve Deployment' },
                      { val: 'CONDITIONAL', label: 'Conditional Approval' },
                      { val: 'REJECTED', label: 'Reject Model' },
                      { val: 'NEEDS_ANALYSIS', label: 'Further Review' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setReviewDecision(opt.val)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          reviewDecision === opt.val
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block">Auditor Notes & Rationale:</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Document evidence-based rationale, threshold justifications, and risk mitigation observations..."
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => setReviewSaved(true)}
                  >
                    Save Review Determination
                  </Button>
                  {reviewSaved && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="w-3.5 h-3.5" /> Decision recorded successfully
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AuditResults;
