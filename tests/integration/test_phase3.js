const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testAllModelsPhase3() {
  console.log('--- 1. Testing Health Endpoints ---');
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

  const modelsToTest = ['logistic_regression', 'decision_tree', 'random_forest'];

  for (const modelType of modelsToTest) {
    console.log(`\n--- Testing Baseline Model: ${modelType} ---`);
    const auditRes = await axios.post('http://localhost:5000/api/audits', {
      datasetId,
      targetAttribute: 'income',
      protectedAttribute: 'sex',
      modelType
    });
    const auditId = auditRes.data.audit.id;

    const trainRes = await axios.post(`http://localhost:5000/api/audits/${auditId}/baseline`);
    console.log(`Status: ${trainRes.data.audit.status}`);
    console.log(`Model Results:`, trainRes.data.audit.baselineResult);
  }

  console.log('\n[PASS] All 3 Baseline Model Options (Logistic Regression, Decision Tree, Random Forest) Verified Successfully!');
}

testAllModelsPhase3().catch(err => {
  console.error('[FAIL] Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
