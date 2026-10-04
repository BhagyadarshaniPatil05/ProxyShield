const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends dataset CSV stream + audit parameters to FastAPI POST /before-after
 */
const compareBeforeAfterWithMlService = async (datasetDoc, targetAttribute, protectedAttribute, modelType, selectedFeatures, strategy = 'REMOVE_FEATURE', referenceGroup = null) => {
  const tempDatasetPath = path.join(__dirname, `../../data/temp/datasets/${datasetDoc._id}.csv`);

  let fileStream;

  if (fs.existsSync(tempDatasetPath)) {
    fileStream = fs.createReadStream(tempDatasetPath);
  } else if (datasetDoc.preview && datasetDoc.preview.length > 0) {
    const keys = datasetDoc.columnNames && datasetDoc.columnNames.length > 0
      ? datasetDoc.columnNames
      : Object.keys(datasetDoc.preview[0]);
    
    const csvHeader = keys.join(',') + '\n';
    const csvRows = datasetDoc.preview.map(row => 
      keys.map(k => {
        const val = row[k];
        return val === null || val === undefined ? '' : String(val);
      }).join(',')
    ).join('\n');

    const csvContent = csvHeader + csvRows;
    fileStream = Buffer.from(csvContent, 'utf-8');
  } else {
    throw new Error('Dataset CSV content unavailable for before vs after comparison.');
  }

  try {
    const formData = new FormData();
    formData.append('file', fileStream, {
      filename: datasetDoc.originalFileName || 'dataset.csv',
      contentType: 'text/csv',
    });
    formData.append('target_attribute', targetAttribute);
    formData.append('protected_attribute', protectedAttribute);
    formData.append('model_type', modelType);
    formData.append('strategy', strategy);
    formData.append('selected_features', Array.isArray(selectedFeatures) ? selectedFeatures.join(',') : String(selectedFeatures));
    if (referenceGroup) {
      formData.append('reference_group', referenceGroup);
    }

    const mlUrl = getMlServiceUrl();
    const response = await axios.post(`${mlUrl}/before-after`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(`ML Service Error: ${error.response.data.detail}`);
    }
    throw new Error(`Failed to communicate with ML service before vs after comparison: ${error.message}`);
  }
};

module.exports = {
  compareBeforeAfterWithMlService,
};
