import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Table, Database, FileText, AlertTriangle, ArrowLeft, ArrowRight, Layers, CheckCircle2, Hash, Percent, Layers2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { getDatasetById } from '../services/api';

const DatasetInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDatasetDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDatasetById(id);
      if (res.success && res.dataset) {
        setDataset(res.dataset);
      } else {
        setError('Failed to load dataset details.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching dataset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDatasetDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="py-20">
        <Loading message="Fetching dataset inspection metadata..." />
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="space-y-4">
        <Link to="/datasets" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Datasets
        </Link>
        <ErrorMessage message={error || 'Dataset not found.'} retry={fetchDatasetDetails} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/dashboard" className="hover:text-cyan-400">Dashboard</Link>
        <span>/</span>
        <Link to="/datasets" className="hover:text-cyan-400">Datasets</Link>
        <span>/</span>
        <span className="font-mono text-cyan-400">{dataset.name}</span>
      </div>

      <PageHeader
        title={`Dataset Inspection: ${dataset.name}`}
        description="Comprehensive dataset structure, schema quality, data types, missing value analysis, and data preview."
        badge={dataset.status || 'INSPECTED'}
        action={
          <div className="flex gap-2">
            <Link to="/datasets">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                Dataset List
              </Button>
            </Link>
            <Button
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/audit/new', { state: { selectedDatasetId: dataset._id } })}
            >
              Configure Audit Task
            </Button>
          </div>
        }
      />

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Rows</span>
            <Hash className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {dataset.rows ? dataset.rows.toLocaleString() : 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sample records in CSV</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Columns</span>
            <Table className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {dataset.columns || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tabular schema features</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Missing Values</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {dataset.totalMissingValues ? dataset.totalMissingValues.toLocaleString() : 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Null / NaN cell entries</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Duplicate Rows</span>
            <Layers2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {dataset.duplicateRows || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Exact row copies found</p>
        </Card>
      </div>

      {/* Column Information Breakdown Table */}
      <Card
        title="Column-Level Information & Schema Breakdown"
        subtitle="Detailed analysis of detected data types, missing percentages, and sample values per column"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Missing</th>
                <th className="py-3 px-4">Missing %</th>
                <th className="py-3 px-4">Unique Values</th>
                <th className="py-3 px-4">Sample / Unique Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {dataset.columnDetails && dataset.columnDetails.length > 0 ? (
                dataset.columnDetails.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">{col.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 text-[10px]">
                        {col.dataType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${col.isNumeric ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'}`}>
                        {col.isNumeric ? 'Numeric' : 'Categorical'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{col.missingCount}</td>
                    <td className="py-3 px-4">
                      <span className={col.missingPercentage > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                        {col.missingPercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{col.uniqueCount}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                      {col.sampleValues && col.sampleValues.length > 0
                        ? col.sampleValues.map(v => (v === null || v === undefined ? 'null' : String(v))).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500">
                    No column details available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dataset Preview */}
      <Card
        title="Dataset Sample Preview"
        subtitle="First 10 records from the dataset (safe JSON view with NaNs handled)"
      >
        {dataset.preview && dataset.preview.length > 0 ? (
          <div className="overflow-x-auto max-h-96 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-950 sticky top-0 text-cyan-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-slate-500">#</th>
                  {dataset.columnNames.map((colName) => (
                    <th key={colName} className="py-2.5 px-3 border-r border-slate-800">
                      {colName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {dataset.preview.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-600 border-r border-slate-800 font-semibold">{idx + 1}</td>
                    {dataset.columnNames.map((colName) => {
                      const val = row[colName];
                      const isNull = val === null || val === undefined;
                      return (
                        <td key={colName} className="py-2 px-3 border-r border-slate-800/60">
                          {isNull ? (
                            <span className="text-amber-500/80 italic font-sans text-[10px]">null</span>
                          ) : (
                            <span className="text-slate-200">{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No preview rows stored for this dataset.
          </div>
        )}
      </Card>
    </div>
  );
};

export default DatasetInspection;
