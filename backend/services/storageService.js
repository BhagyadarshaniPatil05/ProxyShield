const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const TEMP_DIR = path.join(DATA_DIR, 'temp');
const DATASETS_DIR = path.join(TEMP_DIR, 'datasets');
const METADATA_DIR = path.join(TEMP_DIR, 'metadata');
const AUDITS_DIR = path.join(TEMP_DIR, 'audits');

const ensureDirs = () => {
  [DATA_DIR, TEMP_DIR, DATASETS_DIR, METADATA_DIR, AUDITS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initial directory check
ensureDirs();

/**
 * Generate a collision-free 24-character hexadecimal ID.
 */
const generateId = () => crypto.randomBytes(12).toString('hex');

/**
 * Validate an ID (24-char hex string or alphanumeric format)
 */
const isValidId = (id) => typeof id === 'string' && id.trim().length > 0 && /^[a-fA-F0-9]{24}$/.test(id.trim());

/**
 * Helper to attach a .save() method to an audit object for Mongoose compatibility.
 */
const attachAuditMethods = (audit) => {
  if (!audit) return null;
  audit._id = audit._id || audit.id;
  audit.id = audit.id || audit._id;

  audit.save = async function () {
    return saveAudit(this);
  };
  return audit;
};

/**
 * Helper to attach a .save() method to a dataset object.
 */
const attachDatasetMethods = (dataset) => {
  if (!dataset) return null;
  dataset._id = dataset._id || dataset.id;
  dataset.id = dataset.id || dataset._id;

  dataset.save = async function () {
    return saveDataset(this);
  };
  return dataset;
};

// ==========================================
// DATASET OPERATIONS
// ==========================================

const createDataset = async (data) => {
  const id = data._id || data.id || generateId();
  const now = new Date().toISOString();

  const dataset = {
    _id: id,
    id: id,
    name: data.name || data.originalFileName || 'dataset.csv',
    originalFileName: data.originalFileName || 'dataset.csv',
    rows: data.rows || 0,
    columns: data.columns || 0,
    columnNames: data.columnNames || [],
    dataTypes: data.dataTypes || {},
    missingValues: data.missingValues || {},
    missingPercentage: data.missingPercentage || {},
    totalMissingValues: data.totalMissingValues || 0,
    duplicateRows: data.duplicateRows || 0,
    columnDetails: data.columnDetails || [],
    preview: data.preview || [],
    status: data.status || 'INSPECTED',
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  const filePath = path.join(METADATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), 'utf8');

  return attachDatasetMethods(dataset);
};

const getAllDatasets = async () => {
  if (!fs.existsSync(METADATA_DIR)) return [];

  const files = fs.readdirSync(METADATA_DIR).filter((f) => f.endsWith('.json'));
  const datasets = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(METADATA_DIR, file), 'utf8');
      const ds = JSON.parse(content);
      datasets.push(attachDatasetMethods(ds));
    } catch (err) {
      console.error(`[storageService] Error reading dataset metadata ${file}:`, err.message);
    }
  }

  return datasets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getDatasetById = async (id) => {
  if (!id) return null;
  if (typeof id === 'object') {
    if (id.rows !== undefined || id.columnNames !== undefined || id.columnDetails !== undefined) {
      return attachDatasetMethods(id);
    }
    id = id._id || id.id;
  }
  if (!id || typeof id !== 'string') return null;

  const filePath = path.join(METADATA_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const dataset = JSON.parse(content);
    return attachDatasetMethods(dataset);
  } catch (err) {
    console.error(`[storageService] Error reading dataset ${id}:`, err.message);
    return null;
  }
};

const saveDataset = async (dataset) => {
  const id = dataset._id || dataset.id;
  if (!id) throw new Error('Cannot save dataset without an ID.');

  dataset.updatedAt = new Date().toISOString();
  dataset._id = id;
  dataset.id = id;

  const toSave = { ...dataset };
  delete toSave.save;

  const filePath = path.join(METADATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf8');

  return attachDatasetMethods(dataset);
};

const deleteDataset = async (id) => {
  if (!id) return false;
  const metaPath = path.join(METADATA_DIR, `${id}.json`);
  const csvPath = path.join(DATASETS_DIR, `${id}.csv`);

  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

  return true;
};

// ==========================================
// AUDIT OPERATIONS
// ==========================================

const createAudit = async (data) => {
  const id = data._id || data.id || generateId();
  const now = new Date().toISOString();

  const audit = {
    _id: id,
    id: id,
    datasetId: data.datasetId,
    targetAttribute: data.targetAttribute,
    protectedAttribute: data.protectedAttribute,
    modelType: data.modelType || 'random_forest',
    status: data.status || 'CONFIGURED',
    preprocessingSummary: data.preprocessingSummary || '',
    baselineResult: data.baselineResult || null,
    fairnessResult: data.fairnessResult || null,
    proxyCapacityResult: data.proxyCapacityResult || null,
    proxyUseResult: data.proxyUseResult || null,
    featureAblationResult: data.featureAblationResult || null,
    fairnessImpactResult: data.fairnessImpactResult || null,
    interventionResult: data.interventionResult || null,
    mitigatedModelResult: data.mitigatedModelResult || null,
    beforeAfterResult: data.beforeAfterResult || null,
    fairnessUtilityResult: data.fairnessUtilityResult || null,
    reportResult: data.reportResult || null,
    errorMessage: data.errorMessage || null,
    completedAt: data.completedAt || null,
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  const filePath = path.join(AUDITS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(audit, null, 2), 'utf8');

  return attachAuditMethods(audit);
};

const getAllAudits = async () => {
  if (!fs.existsSync(AUDITS_DIR)) return [];

  const files = fs.readdirSync(AUDITS_DIR).filter((f) => f.endsWith('.json'));
  const audits = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(AUDITS_DIR, file), 'utf8');
      const audit = JSON.parse(content);

      // Populate datasetId summary if datasetId is a string ID
      if (audit.datasetId && typeof audit.datasetId === 'string') {
        const dataset = await getDatasetById(audit.datasetId);
        if (dataset) {
          audit.datasetId = {
            _id: dataset._id,
            id: dataset.id,
            name: dataset.name,
            originalFileName: dataset.originalFileName,
            rows: dataset.rows,
            columns: dataset.columns
          };
        }
      }

      audits.push(attachAuditMethods(audit));
    } catch (err) {
      console.error(`[storageService] Error reading audit file ${file}:`, err.message);
    }
  }

  return audits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getAuditById = async (id) => {
  if (!id) return null;

  let targetId = id;
  if (targetId === 'latest') {
    const all = await getAllAudits();
    if (all.length === 0) return null;
    targetId = all[0]._id || all[0].id;
  }

  const filePath = path.join(AUDITS_DIR, `${targetId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const audit = JSON.parse(content);

    // Populate datasetId with full dataset object if it is a string ID
    if (audit.datasetId && typeof audit.datasetId === 'string') {
      const dataset = await getDatasetById(audit.datasetId);
      if (dataset) {
        audit.datasetId = dataset;
      }
    }

    return attachAuditMethods(audit);
  } catch (err) {
    console.error(`[storageService] Error reading audit ${id}:`, err.message);
    return null;
  }
};

const saveAudit = async (audit) => {
  const id = audit._id || audit.id;
  if (!id) throw new Error('Cannot save audit without an ID.');

  audit.updatedAt = new Date().toISOString();
  audit._id = id;
  audit.id = id;

  const toSave = { ...audit };
  delete toSave.save;

  // If datasetId is an object (populated), save only the dataset ID
  if (toSave.datasetId && typeof toSave.datasetId === 'object') {
    toSave.datasetId = toSave.datasetId._id || toSave.datasetId.id;
  }

  const filePath = path.join(AUDITS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf8');

  return attachAuditMethods(audit);
};

const deleteAudit = async (id) => {
  if (!id) return false;
  const filePath = path.join(AUDITS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

module.exports = {
  DATASETS_DIR,
  METADATA_DIR,
  AUDITS_DIR,
  ensureDirs,
  generateId,
  isValidId,
  createDataset,
  getAllDatasets,
  getDatasetById,
  saveDataset,
  deleteDataset,
  createAudit,
  getAllAudits,
  getAuditById,
  saveAudit,
  deleteAudit
};
