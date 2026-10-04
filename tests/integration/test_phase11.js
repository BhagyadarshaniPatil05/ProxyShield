const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase11BeforeAfter() {
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
  console.log('Intervention Status:', intervRes.data.audit.status);

  console.log('\n--- 11. Executing Phase 10 Mitigated Model Training ---');
  const mitigatedRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/mitigated-model`, {
    selectedFeatures: ['education'],
    strategy: 'REMOVE_FEATURE'
  });
  console.log('Mitigated Model Status:', mitigatedRes.data.audit.status);

  console.log('\n--- 12. Executing Phase 11 Before vs After Comparison ---');
  const compRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/before-after`, {
    referenceGroup: 'Male'
  });

  const compResult = compRes.data.audit.beforeAfterResult;
  console.log('Before vs After Status:', compRes.data.audit.status);
  console.log('Reference Group:', compResult.referenceGroup);
  console.log('Fairness Outcome Interpretation:', compResult.fairnessInterpretation);
  console.log('Fairness Interpretation Details:', compResult.fairnessInterpretationDetails);
  console.log('Performance Interpretation:', compResult.performanceInterpretation);
  console.log('Performance Interpretation Details:', compResult.performanceInterpretationDetails);

  console.log('\nPredictive Performance Comparison (Before → After | Delta):');
  console.log('  Accuracy:', compResult.baseline.performance.accuracy, '→', compResult.mitigated.performance.accuracy, '| Δ:', compResult.performanceDelta.accuracy);
  console.log('  F1 Score:', compResult.baseline.performance.f1, '→', compResult.mitigated.performance.f1, '| Δ:', compResult.performanceDelta.f1);

  console.log('\nFairness Disparities Comparison (Before → After | Delta):');
  console.log('  DPD:', compResult.baseline.fairness.dpd, '→', compResult.mitigated.fairness.dpd, '| Δ:', compResult.fairnessDelta.dpd);
  console.log('  DI:', compResult.baseline.fairness.di, '→', compResult.mitigated.fairness.di, '| Δ:', compResult.fairnessDelta.di);
  console.log('  EOD:', compResult.baseline.fairness.eod, '→', compResult.mitigated.fairness.eod, '| Δ:', compResult.fairnessDelta.eod);

  // Assertions
  if (compRes.data.audit.status !== 'BEFORE_AFTER_COMPLETED') {
    throw new Error(`Expected status BEFORE_AFTER_COMPLETED, got ${compRes.data.audit.status}`);
  }
  if (!compResult || !compResult.performanceDelta || !compResult.fairnessDelta) {
    throw new Error('Before vs after comparison result or deltas missing.');
  }

  console.log('\n--- 13. Retrieving Before vs After Results via GET Endpoint ---');
  const getCompRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/before-after`);
  if (getCompRes.data.audit.status !== 'BEFORE_AFTER_COMPLETED') {
    throw new Error('GET /before-after endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 11 Before vs After Comparison Integration Test Passed Successfully!');
}

testPhase11BeforeAfter().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
