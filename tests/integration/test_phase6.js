const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase6ProxyUse() {
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
  const proxyCapRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-capacity`);
  console.log('Proxy Capacity Status:', proxyCapRes.data.audit.status);

  console.log('\n--- 7. Executing Phase 6 Proxy Use Analysis ---');
  const proxyUseRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-use`, {
    selectedFeatures: ['education', 'occupation', 'marital-status', 'relationship', 'age']
  });

  const proxyUseResult = proxyUseRes.data.audit.proxyUseResult;
  console.log('Proxy Use Status:', proxyUseRes.data.audit.status);
  console.log('Model Type:', proxyUseResult.modelType);
  console.log('Candidate Features Count:', proxyUseResult.candidateFeatureCount);
  
  if (proxyUseResult.candidateFeatures && proxyUseResult.candidateFeatures.length > 0) {
    const topFeat = proxyUseResult.candidateFeatures[0];
    console.log('Top Reliance Feature:', topFeat.feature);
    console.log('  SHAP Mean |Value|:', topFeat.shap?.meanAbsoluteValue);
    console.log('  Permutation Importance:', topFeat.permutation?.meanImportance);
    console.log('  Ablation F1 Delta:', topFeat.ablation?.f1Delta);
    console.log('  Prediction Change Rate:', topFeat.ablation?.predictionChangeRate);
    console.log('  Model Reliance Evidence:', topFeat.modelUseEvidence);
  }

  // Validations
  if (proxyUseRes.data.audit.status !== 'PROXY_USE_COMPLETED') {
    throw new Error(`Expected status PROXY_USE_COMPLETED, got ${proxyUseRes.data.audit.status}`);
  }
  if (!proxyUseResult || !proxyUseResult.candidateFeatures || proxyUseResult.candidateFeatures.length === 0) {
    throw new Error('Proxy use results missing or empty');
  }

  console.log('\n--- 8. Retrieving Proxy Use Results via GET Endpoint ---');
  const getProxyUseRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/proxy-use`);
  if (getProxyUseRes.data.audit.status !== 'PROXY_USE_COMPLETED') {
    throw new Error('GET /proxy-use endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 6 Proxy Use / Model Reliance Analysis Integration Test Passed Successfully!');
}

testPhase6ProxyUse().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
