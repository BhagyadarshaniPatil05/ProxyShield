import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const extractErrorMessage = (error, fallbackMessage = 'An unexpected error occurred.') => {
  if (!error) return fallbackMessage;
  if (typeof error === 'string') return error;

  const resData = error.response?.data;
  if (resData) {
    if (typeof resData.error === 'string') {
      return resData.error;
    }
    if (resData.error && typeof resData.error.message === 'string') {
      return resData.error.message;
    }
    if (typeof resData.message === 'string') {
      return resData.message;
    }
  }

  if (typeof error.message === 'string' && error.message !== '[object Object]') {
    return error.message;
  }

  if (typeof error.error === 'string') {
    return error.error;
  }

  return fallbackMessage;
};

export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Express Backend unreachable'));
  }
};

export const checkMlHealth = async () => {
  try {
    const response = await apiClient.get('/ml/health');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Python ML Service proxy unreachable'));
  }
};

export const uploadDataset = async (formData, onProgress) => {
  try {
    const response = await apiClient.post('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Dataset upload failed.'));
  }
};

export const getDatasets = async () => {
  try {
    const response = await apiClient.get('/datasets');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch datasets.'));
  }
};

export const getDatasetById = async (id) => {
  try {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch dataset details.'));
  }
};

export const createAudit = async (auditData) => {
  try {
    const response = await apiClient.post('/audits', auditData);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to create audit configuration.'));
  }
};

export const getAllAudits = async () => {
  try {
    const response = await apiClient.get('/audits');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch audits.'));
  }
};

export const getAuditById = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch audit details.'));
  }
};

export const trainBaseline = async (id) => {
  try {
    const response = await apiClient.post(`/audits/${id}/baseline`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Baseline model training failed.'));
  }
};

export const getAuditResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/results`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch audit results.'));
  }
};

/**
 * Triggers group fairness analysis for an audit.
 */
export const runFairnessAnalysis = async (id, referenceGroup = null) => {
  try {
    const response = await apiClient.post(`/audits/${id}/fairness`, { referenceGroup });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Fairness analysis failed.'));
  }
};

/**
 * Retrieves fairness analysis results for an audit.
 */
export const getFairnessResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/fairness`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch fairness results.'));
  }
};

/**
 * Triggers proxy capacity analysis for an audit.
 */
export const runProxyCapacity = async (id) => {
  try {
    const response = await apiClient.post(`/audits/${id}/proxy-capacity`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Proxy capacity analysis failed.'));
  }
};

/**
 * Retrieves proxy capacity analysis results for an audit.
 */
export const getProxyCapacityResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/proxy-capacity`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch proxy capacity results.'));
  }
};

/**
 * Triggers proxy use / model reliance analysis for an audit.
 */
export const runProxyUse = async (id, selectedFeatures = null) => {
  try {
    const response = await apiClient.post(`/audits/${id}/proxy-use`, { selectedFeatures });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Proxy use analysis failed.'));
  }
};

/**
 * Retrieves proxy use analysis results for an audit.
 */
export const getProxyUseResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/proxy-use`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch proxy use results.'));
  }
};

/**
 * Triggers controlled feature ablation analysis for an audit.
 */
export const runFeatureAblation = async (id, selectedFeatures = null) => {
  try {
    const response = await apiClient.post(`/audits/${id}/ablation`, { selectedFeatures });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Controlled feature ablation analysis failed.'));
  }
};

/**
 * Retrieves controlled feature ablation analysis results for an audit.
 */
export const getAblationResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/ablation`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch controlled feature ablation results.'));
  }
};

/**
 * Triggers Phase 8 Fairness Impact analysis for an audit.
 */
export const runFairnessImpact = async (id, selectedFeatures = null, referenceGroup = null) => {
  try {
    const response = await apiClient.post(`/audits/${id}/fairness-impact`, { selectedFeatures, referenceGroup });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Fairness impact analysis failed.'));
  }
};

/**
 * Retrieves Phase 8 Fairness Impact analysis results for an audit.
 */
export const getFairnessImpactResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/fairness-impact`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch fairness impact results.'));
  }
};

/**
 * Triggers Phase 9 Proxy Intervention analysis for an audit.
 */
export const runProxyIntervention = async (id, selectedFeatures = null, selectedInterventionFeatures = null, strategy = 'REMOVE_FEATURE') => {
  try {
    const response = await apiClient.post(`/audits/${id}/intervention`, { selectedFeatures, selectedInterventionFeatures, strategy });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Proxy intervention analysis failed.'));
  }
};

/**
 * Retrieves Phase 9 Proxy Intervention analysis results for an audit.
 */
export const getInterventionResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/intervention`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch proxy intervention results.'));
  }
};

/**
 * Triggers Phase 10 Mitigated Model training for an audit.
 */
export const runMitigatedModel = async (id, selectedFeatures = null, strategy = 'REMOVE_FEATURE') => {
  try {
    const response = await apiClient.post(`/audits/${id}/mitigated-model`, { selectedFeatures, strategy });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Mitigated model training failed.'));
  }
};

/**
 * Retrieves Phase 10 Mitigated Model training results for an audit.
 */
export const getMitigatedModelResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/mitigated-model`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch mitigated model results.'));
  }
};

/**
 * Triggers Phase 11 Before vs After Comparison for an audit.
 */
export const runBeforeAfter = async (id, referenceGroup = null) => {
  try {
    const response = await apiClient.post(`/audits/${id}/before-after`, { referenceGroup });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Before vs after comparison failed.'));
  }
};

/**
 * Retrieves Phase 11 Before vs After Comparison results for an audit.
 */
export const getBeforeAfterResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/before-after`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch before vs after comparison results.'));
  }
};

/**
 * Triggers Phase 12 Fairness-Utility Trade-off Analysis for an audit.
 */
export const runFairnessUtility = async (id, threshold = 0.01) => {
  try {
    const response = await apiClient.post(`/audits/${id}/fairness-utility`, { threshold });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Fairness-utility trade-off analysis failed.'));
  }
};

/**
 * Retrieves Phase 12 Fairness-Utility Trade-off Analysis results for an audit.
 */
export const getFairnessUtilityResults = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/fairness-utility`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch fairness-utility trade-off results.'));
  }
};

/**
 * Triggers Phase 13 AI Fairness Audit Report Generation for an audit.
 */
export const generateAuditReport = async (id) => {
  try {
    const response = await apiClient.post(`/audits/${id}/report`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Audit report generation failed.'));
  }
};

/**
 * Retrieves Phase 13 JSON Audit Report data model for an audit.
 */
export const getAuditReportJson = async (id) => {
  try {
    const response = await apiClient.get(`/audits/${id}/report`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch audit report.'));
  }
};

/**
 * Helper returning the absolute URL for the HTML printable report.
 */
export const getAuditReportHtmlUrl = (id) => `${API_BASE_URL}/audits/${id}/report/html`;

export default apiClient;
