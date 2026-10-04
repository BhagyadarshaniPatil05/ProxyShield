const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API = 'http://localhost:5000/api';

async function testE2E() {
  console.log('=== STARTING PROXYSHIELD E2E WORKFLOW TEST ===\n');

  // 1. Health Checks
  const healthRes = await axios.get(`${API}/health`);
  console.log('1. Backend Health:', healthRes.data);

  const mlHealthRes = await axios.get(`${API}/ml/health`);
  console.log('2. ML Engine Health:', mlHealthRes.data);

  // 2. Upload Dataset
  const samplePath = path.join(__dirname, '../data/sample/Adult_Income_Sample.csv');
  const form = new FormData();
  form.append('file', fs.createReadStream(samplePath));

  console.log('3. Uploading Adult_Income_Sample.csv...');
  const uploadRes = await axios.post(`${API}/datasets/upload`, form, {
    headers: form.getHeaders(),
  });
  console.log('   Dataset Uploaded! ID:', uploadRes.data.dataset.id);
  const datasetId = uploadRes.data.dataset.id;
  const columnNames = uploadRes.data.inspection.columnNames;
  console.log('   Column Names:', columnNames);

  // 3. Create Audit Configuration
  console.log('\n4. Creating Audit Configuration...');
  const auditReq = {
    datasetId,
    targetAttribute: 'income',
    protectedAttribute: 'sex',
    modelType: 'random_forest'
  };
  const auditRes = await axios.post(`${API}/audits`, auditReq);
  console.log('   Audit Created! Response:', auditRes.data);
  const auditId = auditRes.data.audit.id || auditRes.data.audit._id;
  console.log('   Extracted Audit Mongo ObjectId:', auditId);

  // 4. Train Baseline Model
  console.log('\n5. Training Baseline ML Model...');
  const trainRes = await axios.post(`${API}/audits/${auditId}/baseline`);
  console.log('   Baseline Training Completed! Accuracy:', trainRes.data.audit.baselineResult?.accuracy);

  // 5. Get Audit Results
  console.log('\n6. Fetching Audit Results for ObjectId:', auditId);
  const resultsRes = await axios.get(`${API}/audits/${auditId}/results`);
  console.log('   Results Status:', resultsRes.data.audit.status);
  console.log('   Target Attribute:', resultsRes.data.audit.targetAttribute);
  console.log('   Protected Attribute:', resultsRes.data.audit.protectedAttribute);

  // 6. Test Phase 4 Fairness Analysis
  console.log('\n7. Running Phase 4 Baseline Fairness Analysis...');
  const fairnessRes = await axios.post(`${API}/audits/${auditId}/fairness`, { referenceGroup: 'Male' });
  console.log('   Fairness DPD:', fairnessRes.data.audit.fairnessResult?.metrics?.demographicParityDifference);

  // 7. Test Phase 5 Proxy Capacity
  console.log('\n8. Running Phase 5 Proxy Capacity Analysis...');
  const proxyRes = await axios.post(`${API}/audits/${auditId}/proxy-capacity`);
  console.log('   Proxy Candidates Analyzed:', proxyRes.data.audit.proxyCapacityResult?.candidateFeatureCount);

  // 8. Test Phase 6 Proxy Use
  console.log('\n9. Running Phase 6 Proxy Use / Model Reliance Analysis...');
  const proxyUseRes = await axios.post(`${API}/audits/${auditId}/proxy-use`);
  console.log('   Proxy Use Features:', proxyUseRes.data.audit.proxyUseResult?.features?.length);

  // 9. Test Phase 7 Controlled Feature Ablation
  console.log('\n10. Running Phase 7 Controlled Feature Ablation...');
  const ablationRes = await axios.post(`${API}/audits/${auditId}/ablation`);
  console.log('   Ablation Features Evaluated:', ablationRes.data.audit.featureAblationResult?.features?.length);

  // 10. Test Phase 8 Fairness Impact
  console.log('\n11. Running Phase 8 Fairness Impact Analysis...');
  const impactRes = await axios.post(`${API}/audits/${auditId}/fairness-impact`);
  console.log('   Fairness Impact Experiments:', impactRes.data.audit.fairnessImpactResult?.experiments?.length || impactRes.data.audit.fairnessImpactResult?.features?.length);

  // 11. Test Phase 9 Proxy Intervention
  console.log('\n12. Running Phase 9 Proxy Intervention Config...');
  const interventionRes = await axios.post(`${API}/audits/${auditId}/intervention`, {
    selectedFeatures: ['marital_status', 'relationship'],
    selectedInterventionFeatures: ['marital_status', 'relationship'],
    strategy: 'REMOVE_FEATURE'
  });
  console.log('   Intervention Status:', interventionRes.data.audit.interventionResult?.status);

  // 12. Test Phase 10 Mitigated Model
  console.log('\n13. Running Phase 10 Mitigated Model Training...');
  const mitigatedRes = await axios.post(`${API}/audits/${auditId}/mitigated-model`, {
    selectedFeatures: ['marital_status', 'relationship'],
    strategy: 'REMOVE_FEATURE'
  });
  console.log('   Mitigated Model Accuracy:', mitigatedRes.data.audit.mitigatedModelResult?.accuracy);

  // 13. Test Phase 11 Before vs After Comparison
  console.log('\n14. Running Phase 11 Before vs After Comparison...');
  const beforeAfterRes = await axios.post(`${API}/audits/${auditId}/before-after`, { referenceGroup: 'Male' });
  console.log('   Before vs After DPD Shift:', beforeAfterRes.data.audit.beforeAfterResult?.demographicParityShift);

  // 14. Test Phase 12 Fairness-Utility Trade-off
  console.log('\n15. Running Phase 12 Fairness-Utility Trade-off Analysis...');
  const tradeOffRes = await axios.post(`${API}/audits/${auditId}/fairness-utility`, { threshold: 0.01 });
  console.log('   Trade-off Categorization:', tradeOffRes.data.audit.fairnessUtilityResult?.tradeoffCategorization);

  // 15. Test Phase 13 AI Fairness Audit Report Generation
  console.log('\n16. Generating Phase 13 AI Fairness Audit Report...');
  const reportRes = await axios.post(`${API}/audits/${auditId}/report`);
  console.log('   Report Version:', reportRes.data.audit.reportResult?.reportVersion);

  console.log('\n=== E2E WORKFLOW TEST COMPLETED SUCCESSFULLY! ===\n');
}

testE2E().catch(err => {
  console.error('\nE2E TEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
