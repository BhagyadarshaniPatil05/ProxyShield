const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase12FairnessUtility() {
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
  console.log('Before vs After Status:', compRes.data.audit.status);

  console.log('\n--- 13. Executing Phase 12 Fairness–Utility Trade-off Analysis ---');
  const fuRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-utility`, {
    threshold: 0.01
  });

  const fuResult = fuRes.data.audit.fairnessUtilityResult;
  console.log('Fairness-Utility Status:', fuRes.data.audit.status);
  console.log('Trade-off Classification:', fuResult.tradeoffClassification);
  console.log('Overall Interpretation:', fuResult.overallInterpretation);
  console.log('Threshold Configured:', fuResult.threshold);
  console.log('Fairness Metrics Improved/Worsened/Unchanged:', `${fuResult.fairnessAnalysis.improvedCount} / ${fuResult.fairnessAnalysis.worsenedCount} / ${fuResult.fairnessAnalysis.unchangedCount}`);
  console.log('Utility Metrics Improved/Worsened/Unchanged:', `${fuResult.utilityAnalysis.improvedCount} / ${fuResult.utilityAnalysis.worsenedCount} / ${fuResult.utilityAnalysis.unchangedCount}`);

  console.log('\n--- 14. Retrieving Fairness–Utility Results via GET ---');
  const getRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/fairness-utility`);
  console.log('GET API Status Code:', getRes.status);
  console.log('GET Audit Status:', getRes.data.audit.status);
  console.log('GET Trade-off Classification:', getRes.data.audit.fairnessUtilityResult.tradeoffClassification);

  // Assertions
  if (fuRes.data.audit.status !== 'FAIRNESS_UTILITY_COMPLETED') {
    throw new Error(`Expected status FAIRNESS_UTILITY_COMPLETED, got ${fuRes.data.audit.status}`);
  }
  if (!fuResult || !fuResult.fairnessAnalysis || !fuResult.utilityAnalysis) {
    throw new Error('Fairness-utility trade-off result or analysis sub-objects missing.');
  }
  if (!fuResult.tradeoffClassification || !fuResult.overallInterpretation) {
    throw new Error('Trade-off classification or overall interpretation text missing.');
  }
  if (fuResult.fairnessAnalysis.metrics.length !== 5 || fuResult.utilityAnalysis.metrics.length < 4) {
    throw new Error('Fairness or utility metrics list length incomplete.');
  }

  console.log('\n✅ Phase 12 E2E Integration Test PASSED Successfully!');
}

testPhase12FairnessUtility().catch(err => {
  console.error('\n❌ Phase 12 E2E Integration Test FAILED:', err.message);
  if (err.response) {
    console.error('Response Data:', err.response.data);
  }
  process.exit(1);
});
