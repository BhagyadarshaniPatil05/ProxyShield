const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  uploadAndInspectDataset,
  getAllDatasets,
  getDatasetById
} = require('../controllers/datasetController');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `dataset-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// CSV File Validation Filter
const fileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.csv'];

  if (allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    const error = new Error('Only CSV files are supported.');
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum
  }
});

// Wrapper to handle Multer validation errors gracefully
const handleUploadMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Only CSV files are supported.'
      });
    }
    next();
  });
};

// Routes
router.post('/upload', handleUploadMiddleware, uploadAndInspectDataset);
router.get('/', getAllDatasets);
router.get('/:id', getDatasetById);

module.exports = router;
