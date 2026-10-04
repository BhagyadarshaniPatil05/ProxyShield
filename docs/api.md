# ProxyShield API Documentation

This document specifies the REST API endpoints exposed by the Node.js Express backend and the Python FastAPI ML service.

---

## 1. Node.js Express Backend API

Base URL: `http://localhost:5000/api`

### 1.1 Backend Health Check
- **Endpoint**: `GET /api/health`
- **Response**: `{"status": "ok", "service": "ProxyShield Backend"}`

### 1.2 ML Service Health Proxy
- **Endpoint**: `GET /api/ml/health`
- **Response**: `{"status": "ok", "service": "ProxyShield ML Service"}`

### 1.3 Upload & Inspect Dataset (CSV Only)
- **Endpoint**: `POST /api/datasets/upload`
- **Header**: `Content-Type: multipart/form-data`
- **Field**: `file` (CSV format)
- **Response**: `201 Created` with dataset metadata & 10-row preview.

### 1.4 Get All Uploaded Datasets
- **Endpoint**: `GET /api/datasets`
- **Response**: Array of dataset metadata summaries from MongoDB.

### 1.5 Get Dataset Details by ID
- **Endpoint**: `GET /api/datasets/:id`
- **Response**: Dataset inspection details, column metadata, and preview.

### 1.6 Create Audit Configuration
- **Endpoint**: `POST /api/audits`
- **Body**: `{"datasetId": "...", "targetAttribute": "income", "protectedAttribute": "sex", "modelType": "random_forest"}`
- **Response**: `201 Created` with status `CONFIGURED`.

### 1.7 Get All Audits
- **Endpoint**: `GET /api/audits`
- **Response**: Array of audit task documents from MongoDB.

### 1.8 Execute Baseline ML Training
- **Endpoint**: `POST /api/audits/:id/baseline`
- **Response**: Trains baseline model via FastAPI, stores metrics in MongoDB, updates status to `BASELINE_COMPLETED`.

### 1.9 Get Audit Results
- **Endpoint**: `GET /api/audits/:id/results`
- **Response**: Audit configuration & predictive performance metrics (`accuracy`, `precision`, `recall`, `f1`, `rocAuc`, `confusionMatrix`).

---

## 2. Python FastAPI ML Service API

Base URL: `http://localhost:8000`

### 2.1 FastAPI Health Check
- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok", "service": "ProxyShield ML Service"}`

### 2.2 Dataset Inspection Engine
- **Endpoint**: `POST /inspect-dataset`
- **Request**: `multipart/form-data` with CSV `file`.

### 2.3 Baseline Model Training Engine
- **Endpoint**: `POST /train-baseline`
- **Request**: `multipart/form-data` with `file`, `target_attribute`, `protected_attribute`, `model_type`.
- **Response**: Preprocessing summary and predictive performance metrics on 20% test split.
