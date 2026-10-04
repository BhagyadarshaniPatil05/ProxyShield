const fs = require('fs');
const path = require('path');
const storageService = require('../services/storageService');
const { inspectDatasetWithMlService } = require('../services/datasetService');

/**
 * @desc Upload CSV dataset, inspect with FastAPI ML Service, save metadata locally, & store active CSV for baseline training.
 * @route POST /api/datasets/upload
 */
const uploadAndInspectDataset = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please select a CSV file to upload.'
    });
  }

  const tempFilePath = req.file.path;
  const originalFileName = req.file.originalname;

  try {
    // 1. Inspect CSV with FastAPI ML Service
    const inspectionResult = await inspectDatasetWithMlService(
      tempFilePath,
      originalFileName
    );

    if (!inspectionResult || !inspectionResult.success) {
      throw new Error('Inspection result was unsuccessful.');
    }

    const { dataset: meta, preview } = inspectionResult;

    // 2. Persist dataset metadata to local JSON storage
    const datasetDoc = await storageService.createDataset({
      name: meta.name || originalFileName,
      originalFileName: originalFileName,
      rows: meta.rows || 0,
      columns: meta.columns || 0,
      columnNames: meta.columnNames || [],
      dataTypes: meta.dataTypes || {},
      missingValues: meta.missingValues || {},
      missingPercentage: meta.missingPercentage || {},
      totalMissingValues: meta.totalMissingValues || 0,
      duplicateRows: meta.duplicateRows || 0,
      columnDetails: meta.columnDetails || [],
      preview: preview || [],
      status: 'INSPECTED'
    });

    // 3. Store active CSV copy in data/temp/datasets/<id>.csv
    const activeDatasetPath = path.join(
      storageService.DATASETS_DIR,
      `${datasetDoc._id}.csv`
    );
    fs.copyFileSync(tempFilePath, activeDatasetPath);

    // 4. Return dataset ID and full inspection payload
    return res.status(201).json({
      success: true,
      dataset: {
        id: datasetDoc._id,
        _id: datasetDoc._id,
        name: datasetDoc.name,
        originalFileName: datasetDoc.originalFileName,
        rows: datasetDoc.rows,
        columns: datasetDoc.columns,
        status: datasetDoc.status,
        createdAt: datasetDoc.createdAt
      },
      inspection: datasetDoc
    });

  } catch (error) {
    console.error('[datasetController] Upload inspection failed:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Dataset inspection service failed.'
    });

  } finally {
    // Cleanup temporary upload from uploads/ directory
    if (fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('[Cleanup Warning] Failed to delete temp file:', tempFilePath, err);
      });
    }
  }
};

/**
 * @desc Get list of all uploaded dataset metadata
 * @route GET /api/datasets
 */
const getAllDatasets = async (req, res, next) => {
  try {
    const datasets = await storageService.getAllDatasets();
    return res.status(200).json({
      success: true,
      count: datasets.length,
      datasets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single dataset metadata and inspection details by ID
 * @route GET /api/datasets/:id
 */
const getDatasetById = async (req, res, next) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid dataset ID format.'
    });
  }

  try {
    const dataset = await storageService.getDatasetById(id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not found.'
      });
    }

    return res.status(200).json({
      success: true,
      dataset
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAndInspectDataset,
  getAllDatasets,
  getDatasetById
};
