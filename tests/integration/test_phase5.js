const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase5ProxyCapacity() {
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

  console.log('\n--- 5. Executing Baseline Fairness Analysis ---');
  const fairnessRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness`, {
    referenceGroup: 'Male'
  });
  console.log('Fairness Status:', fairnessRes.data.audit.status);

  console.log('\n--- 6. Executing Phase 5 Proxy Capacity Analysis ---');
  const proxyRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-capacity`);
  const proxyResult = proxyRes.data.audit.proxyCapacityResult;

  console.log('Proxy Capacity Status:', proxyRes.data.audit.status);
  console.log('Protected Attribute:', proxyResult.protectedAttribute);
  console.log('Target Attribute:', proxyResult.targetAttribute);
  console.log('Candidate Features Count:', proxyResult.candidateFeatureCount);
  console.log('Top Ranked Proxy Candidate:', proxyResult.results[0]?.feature, 'Score:', proxyResult.results[0]?.rankingScore, 'Level:', proxyResult.results[0]?.capacityLevel);

  // Validations
  if (proxyRes.data.audit.status !== 'PROXY_CAPACITY_COMPLETED') {
    throw new Error(`Expected status PROXY_CAPACITY_COMPLETED, got ${proxyRes.data.audit.status}`);
  }
  if (!proxyResult || !proxyResult.results || proxyResult.results.length === 0) {
    throw new Error('Proxy capacity results missing or empty');
  }

  // Ensure target & protected attributes are NOT in candidate results
  const featureNames = proxyResult.results.map(r => r.feature);
  if (featureNames.includes('sex')) {
    throw new Error('Protected attribute "sex" was erroneously included as a candidate feature!');
  }
  if (featureNames.includes('income')) {
    throw new Error('Target attribute "income" was erroneously included as a candidate feature!');
  }

  console.log('\n--- 7. Retrieving Proxy Capacity Results via GET Endpoint ---');
  const getProxyRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/proxy-capacity`);
  if (getProxyRes.data.audit.status !== 'PROXY_CAPACITY_COMPLETED') {
    throw new Error('GET /proxy-capacity endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 5 Proxy Capacity Analysis Integration Test Passed Successfully!');
}

testPhase5ProxyCapacity().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
