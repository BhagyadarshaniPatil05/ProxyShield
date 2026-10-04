const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase9ProxyIntervention() {
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
  const proxyUseRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-use`);
  console.log('Proxy Use Status:', proxyUseRes.data.audit.status);

  console.log('\n--- 8. Executing Phase 7 Controlled Feature Ablation ---');
  const ablationRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/ablation`);
  console.log('Ablation Status:', ablationRes.data.audit.status);

  console.log('\n--- 9. Executing Phase 8 Fairness Impact Analysis ---');
  const impactRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-impact`);
  console.log('Fairness Impact Status:', impactRes.data.audit.status);

  console.log('\n--- 10. Executing Phase 9 Proxy Intervention Configuration ---');
  const intervRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/intervention`, {
    selectedFeatures: ['education', 'occupation', 'marital-status', 'relationship', 'age'],
    strategy: 'REMOVE_FEATURE'
  });

  const intervResult = intervRes.data.audit.interventionResult;
  console.log('Intervention Status:', intervRes.data.audit.status);
  console.log('Target Attribute:', intervResult.targetAttribute);
  console.log('Protected Attribute:', intervResult.protectedAttribute);
  console.log('Configured Strategy:', intervResult.strategy);
  console.log('Decision Status:', intervResult.decisionStatus);
  console.log('Candidates Evaluated Count:', intervResult.candidateFeatureCount);
  console.log('Recommended Feature Count:', intervResult.recommendedFeatureCount);
  console.log('Selected Features List:', intervResult.selectedFeatures);

  if (intervResult.candidates && intervResult.candidates.length > 0) {
    const cand = intervResult.candidates[0];
    console.log('\nSample Candidate Proxy Intervention Recommendation:');
    console.log('  Feature Name:', cand.featureName || cand.feature);
    console.log('  Recommendation:', cand.recommendation);
    console.log('  Strategy:', cand.strategy);
    console.log('  Selected:', cand.selected);
    console.log('  Rationale:', cand.rationale);
  }

  // Validations
  if (intervRes.data.audit.status !== 'INTERVENTION_COMPLETED') {
    throw new Error(`Expected status INTERVENTION_COMPLETED, got ${intervRes.data.audit.status}`);
  }
  if (!intervResult || !intervResult.candidates || intervResult.candidates.length === 0) {
    throw new Error('Intervention results missing or empty');
  }
  if (intervResult.decisionStatus !== 'PENDING_HUMAN_REVIEW') {
    throw new Error(`Expected decisionStatus PENDING_HUMAN_REVIEW, got ${intervResult.decisionStatus}`);
  }

  console.log('\n--- 11. Retrieving Proxy Intervention Results via GET Endpoint ---');
  const getIntervRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/intervention`);
  if (getIntervRes.data.audit.status !== 'INTERVENTION_COMPLETED') {
    throw new Error('GET /intervention endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 9 Proxy Intervention Integration Test Passed Successfully!');
}

testPhase9ProxyIntervention().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
