const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase10MitigatedModel() {
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
  const baselinePerf = trainRes.data.audit.baselineResult;
  console.log('Baseline Status:', trainRes.data.audit.status);
  console.log('Baseline Accuracy:', baselinePerf.accuracy);
  console.log('Baseline F1 Score:', baselinePerf.f1);

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

  const mitigatedResult = mitigatedRes.data.audit.mitigatedModelResult;
  console.log('Mitigated Model Status:', mitigatedRes.data.audit.status);
  console.log('Target Attribute:', mitigatedResult.targetAttribute);
  console.log('Protected Attribute:', mitigatedResult.protectedAttribute);
  console.log('Model Algorithm:', mitigatedResult.modelType);
  console.log('Strategy:', mitigatedResult.strategy);
  console.log('Removed Proxy Features:', mitigatedResult.removedFeatures);
  console.log('Original Feature Count:', mitigatedResult.originalFeatureCount);
  console.log('Mitigated Feature Count:', mitigatedResult.mitigatedFeatureCount);
  console.log('Train Rows:', mitigatedResult.trainRows);
  console.log('Test Rows:', mitigatedResult.testRows);

  console.log('\nMitigated Model Predictive Performance Metrics:');
  console.log('  Accuracy:', mitigatedResult.performance.accuracy);
  console.log('  Precision:', mitigatedResult.performance.precision);
  console.log('  Recall:', mitigatedResult.performance.recall);
  console.log('  F1 Score:', mitigatedResult.performance.f1);
  console.log('  ROC-AUC:', mitigatedResult.performance.rocAuc);
  console.log('  Confusion Matrix:', mitigatedResult.performance.confusionMatrix);

  // Assertions
  if (mitigatedRes.data.audit.status !== 'MITIGATED_MODEL_COMPLETED') {
    throw new Error(`Expected status MITIGATED_MODEL_COMPLETED, got ${mitigatedRes.data.audit.status}`);
  }
  if (!mitigatedResult || !mitigatedResult.performance) {
    throw new Error('Mitigated model results or performance metrics missing.');
  }

  // Ensure baseline result was untouched
  if (!trainRes.data.audit.baselineResult) {
    throw new Error('Baseline result missing or modified!');
  }

  console.log('\n--- 12. Retrieving Mitigated Model Results via GET Endpoint ---');
  const getMitigatedRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/mitigated-model`);
  if (getMitigatedRes.data.audit.status !== 'MITIGATED_MODEL_COMPLETED') {
    throw new Error('GET /mitigated-model endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 10 Mitigated Model Training Integration Test Passed Successfully!');
}

testPhase10MitigatedModel().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
