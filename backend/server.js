const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const healthRoutes = require('./routes/healthRoutes');
const datasetRoutes = require('./routes/datasetRoutes');
const auditRoutes = require('./routes/auditRoutes');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Storage initialization (Filesystem-based persistence in data/temp/)
const storageService = require('./services/storageService');
storageService.ensureDirs();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/audits', auditRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[ProxyShield Backend] Express server running on port ${PORT}`);
  console.log(`[ProxyShield Backend] Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`[ProxyShield Backend] ML Health proxy: http://localhost:${PORT}/api/ml/health`);
  console.log(`[ProxyShield Backend] Datasets API: http://localhost:${PORT}/api/datasets`);
  console.log(`[ProxyShield Backend] Audits API: http://localhost:${PORT}/api/audits`);
});
