const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase7FeatureAblation() {
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
  const ablationRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/ablation`, {
    selectedFeatures: ['education', 'occupation', 'marital-status', 'relationship', 'age']
  });

  const ablationResult = ablationRes.data.audit.featureAblationResult;
  console.log('Ablation Status:', ablationRes.data.audit.status);
  console.log('Model Type:', ablationResult.modelType);
  console.log('Test Set Size:', ablationResult.testRows || ablationResult.testSetSize);
  console.log('Baseline Accuracy:', ablationResult.baselinePerformance?.accuracy);
  console.log('Baseline F1:', ablationResult.baselinePerformance?.f1);
  console.log('Candidate Features Evaluated:', ablationResult.candidateFeatures?.length || ablationResult.features?.length);

  if (ablationResult.candidateFeatures && ablationResult.candidateFeatures.length > 0) {
    const feat = ablationResult.candidateFeatures[0];
    console.log('\nSample Candidate Feature Ablation Result:');
    console.log('  Feature Name:', feat.featureName || feat.feature);
    console.log('  Neutralization Value:', feat.neutralizationValue);
    console.log('  Neutralization Strategy:', feat.neutralizationStrategy);
    console.log('  Ablated Accuracy:', feat.ablatedPerformance?.accuracy);
    console.log('  Accuracy Delta:', feat.performanceDelta?.accuracy ?? feat.deltas?.accuracyDelta);
    console.log('  F1 Delta:', feat.performanceDelta?.f1 ?? feat.deltas?.f1Delta);
    console.log('  Prediction Change Rate:', feat.predictionChangeRate);
    console.log('  Mean Prob Change:', feat.meanProbabilityChange);
    console.log('  Observation:', feat.observations || feat.analyticalObservation);
  }

  // Validations
  if (ablationRes.data.audit.status !== 'ABLATION_COMPLETED') {
    throw new Error(`Expected status ABLATION_COMPLETED, got ${ablationRes.data.audit.status}`);
  }
  if (!ablationResult || !ablationResult.candidateFeatures || ablationResult.candidateFeatures.length === 0) {
    throw new Error('Feature ablation results missing or empty');
  }

  console.log('\n--- 9. Retrieving Feature Ablation Results via GET Endpoint ---');
  const getAblationRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/ablation`);
  if (getAblationRes.data.audit.status !== 'ABLATION_COMPLETED') {
    throw new Error('GET /ablation endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 7 Controlled Feature Ablation Integration Test Passed Successfully!');
}

testPhase7FeatureAblation().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
