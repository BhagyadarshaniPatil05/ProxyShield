const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase8FairnessImpact() {
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
  const impactRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-impact`, {
    selectedFeatures: ['education', 'occupation', 'marital-status', 'relationship', 'age'],
    referenceGroup: 'Male'
  });

  const impactResult = impactRes.data.audit.fairnessImpactResult;
  console.log('Fairness Impact Status:', impactRes.data.audit.status);
  console.log('Model Type:', impactResult.modelType);
  console.log('Reference Group:', impactResult.referenceGroup);
  console.log('Test Set Size:', impactResult.testRows);
  console.log('Baseline DPD:', impactResult.baselineFairness?.demographicParityDifference);
  console.log('Baseline EOD:', impactResult.baselineFairness?.equalOpportunityDifference);
  console.log('Candidate Feature Experiments Evaluated:', impactResult.experiments?.length);

  if (impactResult.experiments && impactResult.experiments.length > 0) {
    const exp = impactResult.experiments[0];
    console.log('\nSample Candidate Feature Fairness Impact Result:');
    console.log('  Feature Name:', exp.featureName || exp.feature);
    console.log('  Strategy:', exp.neutralizationStrategy);
    console.log('  Baseline DPD:', exp.baselineFairness?.demographicParityDifference);
    console.log('  Ablated DPD:', exp.ablatedFairness?.demographicParityDifference);
    console.log('  Delta DPD:', exp.fairnessDelta?.demographicParityDifference);
    console.log('  Baseline EOD:', exp.baselineFairness?.equalOpportunityDifference);
    console.log('  Ablated EOD:', exp.ablatedFairness?.equalOpportunityDifference);
    console.log('  Delta EOD:', exp.fairnessDelta?.equalOpportunityDifference);
    console.log('  Evidence Summary:', exp.evidenceSummary);
    console.log('  Interpretation:', exp.interpretation || exp.observations);
  }

  // Validations
  if (impactRes.data.audit.status !== 'FAIRNESS_IMPACT_COMPLETED') {
    throw new Error(`Expected status FAIRNESS_IMPACT_COMPLETED, got ${impactRes.data.audit.status}`);
  }
  if (!impactResult || !impactResult.experiments || impactResult.experiments.length === 0) {
    throw new Error('Fairness impact results missing or empty');
  }

  console.log('\n--- 10. Retrieving Fairness Impact Results via GET Endpoint ---');
  const getImpactRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/fairness-impact`);
  if (getImpactRes.data.audit.status !== 'FAIRNESS_IMPACT_COMPLETED') {
    throw new Error('GET /fairness-impact endpoint returned unexpected status');
  }

  console.log('\n[PASS] Phase 8 Fairness Impact Analysis Integration Test Passed Successfully!');
}

testPhase8FairnessImpact().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
