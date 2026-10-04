const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPhase13ReportGeneration() {
  console.log('================================================================');
  console.log('      PROXYSHIELD PHASE 13 REPORT GENERATION E2E TEST          ');
  console.log('================================================================');

  console.log('\n--- 1. Health Checks ---');
  const h1 = await axios.get('http://localhost:5000/api/health');
  console.log('Backend Express Health:', h1.data);

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

  console.log('\n--- 4. Testing Premature Report Request (Should Fail Readiness Check) ---');
  try {
    await axios.post(`http://localhost:5000/api/audits/${auditId}/report`);
    console.error('❌ Premature report generation should have failed but succeeded!');
    process.exit(1);
  } catch (err) {
    console.log('✅ Premature Report Request Rejected Correctly:', err.response?.data?.error || err.message);
  }

  console.log('\n--- 5. Executing Pipeline Phase 3: Baseline Model Training ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/baseline`);

  console.log('--- 6. Executing Pipeline Phase 4: Baseline Fairness Analysis ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness`, { referenceGroup: 'Male' });

  console.log('--- 7. Executing Pipeline Phase 5: Proxy Capacity Analysis ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-capacity`);

  console.log('--- 8. Executing Pipeline Phase 6: Proxy Use Analysis ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/proxy-use`);

  console.log('--- 9. Executing Pipeline Phase 7: Controlled Feature Ablation ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/ablation`);

  console.log('--- 10. Executing Pipeline Phase 8: Fairness Impact Analysis ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-impact`);

  console.log('--- 11. Executing Pipeline Phase 9: Proxy Intervention Configuration ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/intervention`, {
    selectedFeatures: ['education'],
    strategy: 'REMOVE_FEATURE'
  });

  console.log('--- 12. Executing Pipeline Phase 10: Mitigated Model Training ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/mitigated-model`);

  console.log('--- 13. Executing Pipeline Phase 11: Before vs After Comparison ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/before-after`);

  console.log('--- 14. Executing Pipeline Phase 12: Fairness-Utility Trade-off Analysis ---');
  await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-utility`);

  console.log('\n--- 15. Executing Phase 13 AI Fairness Audit Report Generation ---');
  const genReportRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/report`);
  console.log('Report Generation Endpoint Status Code:', genReportRes.status);
  console.log('Report Generation Audit Status:', genReportRes.data.audit.status);

  const reportData = genReportRes.data.audit.reportResult.reportData;
  console.log('Generated Audit ID:', reportData.auditId);
  console.log('Target Attribute:', reportData.scope?.targetAttribute);
  console.log('Protected Attribute:', reportData.scope?.protectedAttribute);
  console.log('SHA-256 Dataset Fingerprint:', reportData.scope?.datasetFingerprint);
  console.log('Trade-off Outcome Classification:', reportData.fairnessUtility?.tradeoffClassification);

  console.log('\n--- 16. Retrieving JSON Audit Report Data Model via GET ---');
  const getJsonRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/report`);
  console.log('GET JSON Report Status Code:', getJsonRes.status);
  console.log('GET JSON Executive Summary Preview:', getJsonRes.data.report.executiveSummary.substring(0, 80) + '...');

  console.log('\n--- 17. Retrieving Printable HTML Audit Report via GET ---');
  const getHtmlRes = await axios.get(`http://localhost:5000/api/audits/${auditId}/report/html`);
  console.log('GET HTML Report Status Code:', getHtmlRes.status);
  console.log('GET HTML Content Length:', getHtmlRes.data.length, 'bytes');

  // Validations
  if (genReportRes.data.audit.status !== 'REPORT_GENERATED') {
    throw new Error(`Expected status REPORT_GENERATED, got ${genReportRes.data.audit.status}`);
  }
  if (!reportData || !reportData.reproducibility || !reportData.responsibleAI) {
    throw new Error('Report data model missing required metadata fields');
  }
  if (!getHtmlRes.data.includes('ProxyShield AI Fairness Audit Report')) {
    throw new Error('Rendered HTML report missing main header text');
  }
  if (!getHtmlRes.data.includes('window.print()')) {
    throw new Error('Rendered HTML report missing print trigger function');
  }

  console.log('\n================================================================');
  console.log('  ✅ Phase 13 AI Fairness Audit Report Generation Test PASSED!');
  console.log('================================================================');
}

testPhase13ReportGeneration().catch(err => {
  console.error('Test Execution Error:', err.response ? err.response.data : err.message);
  process.exit(1);
});
