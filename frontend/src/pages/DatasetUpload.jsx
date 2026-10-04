import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, ArrowRight, Table, AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { uploadDataset } from '../services/api';

const DatasetUpload = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedDatasetId, setUploadedDatasetId] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'csv') {
      setError('Only CSV files are supported. Please select a valid .csv dataset file.');
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setError('Uploaded dataset file is empty.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'csv') {
        setError('Only CSV files are supported. Please select a valid .csv dataset file.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await uploadDataset(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (response.success && response.dataset?.id) {
        setUploadedDatasetId(response.dataset.id);
        // Navigate immediately to the dataset inspection page
        navigate(`/datasets/${response.dataset.id}`);
      } else {
        setError('Upload succeeded but no dataset ID was returned.');
      }
    } catch (err) {
      setError(err.message || 'Dataset upload and inspection failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Upload Structured Dataset"
        description="Upload a CSV dataset to inspect its structure, data types, missing values, and basic quality indicators before starting an AI fairness audit."
        badge="Dataset Pipeline"
      />

      <Card title="CSV Dataset Upload">
        <form onSubmit={handleUploadSubmit} className="space-y-6 py-2">
          {error && <ErrorMessage message={error} />}

          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 transition-colors rounded-xl p-8 text-center bg-slate-950/60 cursor-pointer relative group"
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-3 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Click to select or drag & drop CSV file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported format: <code className="font-mono text-cyan-400">.csv</code> (Max file size: 50MB)
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-medium text-slate-200 text-xs font-mono">{selectedFile.name}</h4>
                  <p className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Ready for Inspection
              </span>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Uploading & Inspecting dataset...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full"
            size="lg"
            icon={uploading ? RefreshCw : Upload}
          >
            {uploading ? 'Inspecting CSV Dataset...' : 'Upload & Inspect Dataset'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default DatasetUpload;
