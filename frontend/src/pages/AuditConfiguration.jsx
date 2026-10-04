import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sliders, Shield, Cpu, Play, Layers, AlertCircle, Database, HelpCircle, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { getDatasets, createAudit, trainBaseline } from '../services/api';

const AuditConfiguration = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const [datasetId, setDatasetId] = useState('');
  const [targetAttribute, setTargetAttribute] = useState('');
  const [protectedAttribute, setProtectedAttribute] = useState('');
  const [modelType, setModelType] = useState('random_forest');

  const [columnNames, setColumnNames] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState('');
  const [error, setError] = useState(null);

  // Load uploaded datasets from MongoDB
  const fetchUploadedDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const res = await getDatasets();
      if (res.success && Array.isArray(res.datasets) && res.datasets.length > 0) {
        setDatasets(res.datasets);

        // Pre-select dataset passed from navigation state or default to first dataset
        const preSelectedId = location.state?.selectedDatasetId || res.datasets[0]._id;
        const initialDs = res.datasets.find(d => d._id === preSelectedId) || res.datasets[0];
        
        setDatasetId(initialDs._id);
        const cols = initialDs.columnNames || [];
        setColumnNames(cols);

        if (cols.length >= 2) {
          setTargetAttribute(cols[cols.length - 1]);
          setProtectedAttribute(cols[0]);
        }
      } else {
        setDatasets([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load datasets.');
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    fetchUploadedDatasets();
  }, []);

  const handleDatasetChange = (e) => {
    const selectedId = e.target.value;
    setDatasetId(selectedId);
    setError(null);

    const ds = datasets.find(d => d._id === selectedId);
    if (ds) {
      const cols = ds.columnNames || [];
      setColumnNames(cols);
      if (cols.length >= 2) {
        setTargetAttribute(cols[cols.length - 1]);
        setProtectedAttribute(cols[0]);
      } else {
        setTargetAttribute('');
        setProtectedAttribute('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!datasetId) {
      setError('Please select a dataset.');
      return;
    }
    if (!targetAttribute) {
      setError('Please select a target attribute.');
      return;
    }
    if (!protectedAttribute) {
      setError('Please select a protected attribute.');
      return;
    }
    if (targetAttribute === protectedAttribute) {
      setError('Target and protected attributes must be different.');
      return;
    }

    setSubmitting(true);
    setTrainingStatus('Creating audit task configuration...');

    try {
      // 1. Create Audit document
      const auditRes = await createAudit({
        datasetId,
        targetAttribute,
        protectedAttribute,
        modelType
      });

      if (!auditRes.success || !(auditRes.audit?.id || auditRes.audit?._id)) {
        throw new Error('Audit configuration creation failed.');
      }

      const auditId = auditRes.audit.id || auditRes.audit._id;

      // 2. Trigger baseline ML training
      setTrainingStatus('Training baseline classifier & evaluating performance...');
      const trainRes = await trainBaseline(auditId);

      if (trainRes.success) {
        navigate(`/audit/${auditId}/results`);
      } else {
        throw new Error('Baseline training failed to complete.');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete baseline audit training.');
    } finally {
      setSubmitting(false);
      setTrainingStatus('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configure New Audit"
        description="Select your dataset, target outcome, protected demographic attribute, and machine learning classifier to begin auditing."
        badge="Audit Setup"
      />

      {error && <ErrorMessage message={error} />}

      {loadingDatasets ? (
        <div className="py-12">
          <Loading message="Loading datasets from database..." />
        </div>
      ) : datasets.length === 0 ? (
        <Card className="py-12 text-center space-y-4">
          <Database className="w-10 h-10 text-slate-700 mx-auto" />
          <h3 className="font-semibold text-slate-200">No Datasets Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You need to upload a structured CSV dataset before configuring an audit.
          </p>
          <Link to="/datasets/upload">
            <Button icon={Database}>Upload Dataset First</Button>
          </Link>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Audit Specification & Model Selection">
              <div className="space-y-6">
                {/* Step 1: Select Dataset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Step 1 — Select Dataset
                  </label>
                  <select
                    value={datasetId}
                    onChange={handleDatasetChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  >
                    {datasets.map((ds) => (
                      <option key={ds._id} value={ds._id}>
                        {ds.name} ({ds.rows ? ds.rows.toLocaleString() : 0} rows, {ds.columns} cols)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2 & 3: Target & Protected Attributes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Outcome */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Step 2 — Target Attribute ($Y$)
                    </label>
                    <select
                      value={targetAttribute}
                      onChange={(e) => setTargetAttribute(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:border-cyan-500 outline-none font-mono"
                    >
                      {columnNames.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Supervised label predicted by baseline ML classifier.</p>
                  </div>

                  {/* Protected Attribute */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Step 3 — Protected Attribute ($A$)
                    </label>
                    <select
                      value={protectedAttribute}
                      onChange={(e) => setProtectedAttribute(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:border-cyan-500 outline-none font-mono text-cyan-400"
                    >
                      {columnNames.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Sensitive variable saved for subsequent fairness audit phases.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Note:</strong> Protected attributes are selected now for later fairness analysis. No fairness calculation or proxy score is performed during baseline training.
                  </p>
                </div>

                {/* Step 4: Model Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Step 4 — Select Baseline Model
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: 'random_forest', name: 'Random Forest', desc: 'Ensemble of 100 decision trees (scikit-learn)' },
                      { id: 'logistic_regression', name: 'Logistic Regression', desc: 'Linear classification with StandardScaler' },
                      { id: 'decision_tree', name: 'Decision Tree', desc: 'Single deterministic decision tree' }
                    ].map((model) => (
                      <div
                        key={model.id}
                        onClick={() => setModelType(model.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          modelType === model.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/5'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                          <span>{model.name}</span>
                          {modelType === model.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{model.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
              icon={Play}
            >
              {submitting ? trainingStatus || 'Training Baseline Model...' : 'Start Baseline Model Audit'}
            </Button>
          </div>

          {/* Workflow Info Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card title="Baseline Workflow">
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Cpu className="w-4 h-4" />
                    <span>Scikit-Learn Execution Engine</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-400 font-mono text-[11px] pt-1">
                    <li>80 / 20 Stratified Train-Test Split</li>
                    <li>SimpleImputer Missing Imputation</li>
                    <li>OneHotEncoder Categorical Encoding</li>
                    <li>Predictive Metrics: Accuracy, Precision, Recall, F1, ROC-AUC</li>
                    <li>Confusion Matrix Evaluation</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
};

export default AuditConfiguration;
