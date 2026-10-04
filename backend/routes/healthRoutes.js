const express = require('express');
const router = express.Router();
const { getBackendHealth, getMlServiceHealth } = require('../controllers/healthController');

router.get('/health', getBackendHealth);
router.get('/ml/health', getMlServiceHealth);

module.exports = router;
