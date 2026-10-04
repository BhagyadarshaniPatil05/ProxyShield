const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testBaselineReproducibility() {
  console.log('================================================================');
  console.log('   PROXYSHIELD BASELINE EXPERIMENT REPRODUCIBILITY E2E TEST     ');
  console.log('================================================================');

  console.log('\n--- 1. Health Checks ---');
  const h1 = await axios.get('http://localhost:5000/api/health');
  console.log('Backend Express Health:', h1.data);

  console.log('\n--- 2. Uploading Benchmark CSV Dataset ---');
  const csvPath = path.join(__dirname, '../../data/sample/Adult_Income_Sample.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }
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

  console.log('\n--- 4. Executing Phase 3 Baseline Model Training ---');
  const trainRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/baseline`);
  console.log('Baseline Training Status:', trainRes.data.audit.status);

  console.log('\n--- 5. Executing Phase 4 Baseline Fairness Analysis ---');
  const fairnessRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness`, {
    referenceGroup: 'Male'
  });
  console.log('Phase 4 Fairness Status:', fairnessRes.data.audit.status);
  const p4Metrics = fairnessRes.data.audit.fairnessResult.metrics;

  console.log('\n--- 6. Executing Phase 8 Fairness Impact Analysis ---');
  const impactRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-impact`, {
    referenceGroup: 'Male'
  });
  console.log('Phase 8 Impact Status:', impactRes.data.audit.status);
  const p8Metrics = impactRes.data.audit.fairnessImpactResult.baselineFairness;

  console.log('\n--- 7. Executing Phase 9 Proxy Intervention Configuration ---');
  const intervRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/intervention`, {
    selectedFeatures: ['education', 'occupation'],
    interventionType: 'REMOVE_FEATURE',
    tradeoffPreference: 'BALANCED'
  });
  console.log('Phase 9 Intervention Status:', intervRes.data.audit.status);

  console.log('\n--- 8. Executing Phase 10 Mitigated Model Training ---');
  const mitRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/mitigated-model`);
  console.log('Phase 10 Mitigated Model Status:', mitRes.data.audit.status);

  console.log('\n--- 9. Executing Phase 11 Before-vs-After Comparison ---');
  const baRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/before-after`);
  console.log('Phase 11 Before-vs-After Status:', baRes.data.audit.status);
  const p11Metrics = baRes.data.audit.beforeAfterResult.baseline.fairness;

  console.log('\n--- 10. Executing Phase 12 Fairness-Utility Trade-off Analysis ---');
  const fuRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/fairness-utility`);
  console.log('Phase 12 Fairness-Utility Status:', fuRes.data.audit.status);
  const p12FairnessList = fuRes.data.audit.fairnessUtilityResult.fairnessAnalysis.metrics;
  const p12Metrics = {};
  p12FairnessList.forEach(m => { p12Metrics[m.metric] = m.before; });

  console.log('\n================================================================');
  console.log('              BASELINE FAIRNESS PARITY AUDIT RESULTS            ');
  console.log('================================================================');

  const getNum = (val) => val !== null && val !== undefined ? Number(val.toFixed(4)) : null;

  const p4_dpd = getNum(p4Metrics.demographicParityDifference);
  const p8_dpd = getNum(p8Metrics.demographicParityDifference);
  const p11_dpd = getNum(p11Metrics.dpd);
  const p12_dpd = getNum(p12Metrics['DPD']);

  const p4_di = getNum(p4Metrics.disparateImpact);
  const p8_di = getNum(p8Metrics.disparateImpact);
  const p11_di = getNum(p11Metrics.di);

  const p4_eod = getNum(p4Metrics.equalOpportunityDifference);
  const p8_eod = getNum(p8Metrics.equalOpportunityDifference);
  const p11_eod = getNum(p11Metrics.eod);

  console.log(`Phase 4 DPD: ${p4_dpd} | Phase 8 DPD: ${p8_dpd} | Phase 11 DPD: ${p11_dpd} | Phase 12 DPD: ${p12_dpd}`);
  console.log(`Phase 4 DI:  ${p4_di} | Phase 8 DI:  ${p8_di} | Phase 11 DI:  ${p11_di}`);
  console.log(`Phase 4 EOD: ${p4_eod} | Phase 8 EOD: ${p8_eod} | Phase 11 EOD: ${p11_eod}`);

  const dpdMatches = p4_dpd === p8_dpd && p8_dpd === p11_dpd && p11_dpd === p12_dpd;
  const diMatches = p4_di === p8_di && p8_di === p11_di;
  const eodMatches = p4_eod === p8_eod && p8_eod === p11_eod;

  if (!dpdMatches || !diMatches || !eodMatches) {
    console.error('\n❌ BASELINE REPRODUCIBILITY AUDIT FAILED: Metrics are non-identical across phases!');
    process.exit(1);
  }

  console.log('\n✅ BASELINE REPRODUCIBILITY VERIFIED AFTER CORRECTION!');
  console.log('All baseline metrics match 100% across Phase 4, Phase 8, Phase 11, and Phase 12.');
}

testBaselineReproducibility().catch(err => {
  console.error('Test Execution Error:', err.response ? err.response.data : err.message);
  process.exit(1);
});
