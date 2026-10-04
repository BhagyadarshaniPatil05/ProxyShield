const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase4FairnessAnalysis() {
  console.log('--- 1. Health Checks ---');
  const h1 = await axios.get('http://localhost:5000/api/health');
  console.log('Backend Health:', h1.data);

  console.log('\n--- 2. Uploading Benchmark CSV Dataset ---');
  const csvPath = path.join(__dirname, '../../data/sample/Adult_Income_Sample.csv');
  const form = new FormData();
  form.append('file', fs.createReadStream(csvPath));
  
  const upRes = await axios.post('http://localhost:5000/api/datasets/upload', form, {
    headers: form.getHeaders()
  });
  const datasetId = upRes.data.dataset.id;
  console.log('Dataset Uploaded ID:', datasetId);

  console.log('\n--- 3. Creating Audit Configuration ---');
  const auditRes = await axios.post('http://localhost:5000/api/audits', {
    datasetId,
    targetAttribute: 'income',
    protectedAttribute: 'sex',
    modelType: 'random_forest'
  });
  const auditId = auditRes.data.audit.id;
  console.log('Audit ID Created:', auditId);

  console.log('\n--- 4. Executing Baseline Model Training ---');
  const trainRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/baseline`);
  console.log('Baseline Status:', trainRes.data.audit.status);
  console.log('Accuracy:', trainRes.data.audit.baselineResult.accuracy);

  console.log('\n--- 5. Executing Baseline Fairness Analysis ---');
  const fairnessRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness`, {
    referenceGroup: 'Male'
  });

  const fairnessResult = fairnessRes.data.audit.fairnessResult;
  console.log('Fairness Analysis Status:', fairnessRes.data.audit.status);
  console.log('Reference Group:', fairnessResult.referenceGroup);
  console.log('Comparison Groups:', fairnessResult.comparisonGroups);
  console.log('Disparity Metrics:', fairnessResult.metrics);
  console.log('Group Metrics Count:', fairnessResult.groupMetrics.length);

  // Validations
  if (fairnessRes.data.audit.status !== 'FAIRNESS_ANALYSIS_COMPLETED') {
    throw new Error(`Expected status FAIRNESS_ANALYSIS_COMPLETED, got ${fairnessRes.data.audit.status}`);
  }
  if (!fairnessResult || !fairnessResult.metrics || fairnessResult.groupMetrics.length === 0) {
    throw new Error('Fairness result or group metrics missing');
  }

  console.log('\n--- 6. Retrieving Fairness Analysis Endpoint ---');
  const getFairnessRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/fairness`);
  if (getFairnessRes.data.audit.status !== 'FAIRNESS_ANALYSIS_COMPLETED') {
    throw new Error('GET /fairness endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 4 Baseline Fairness Analysis Integration Test Passed Successfully!');
}

testPhase4FairnessAnalysis().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
