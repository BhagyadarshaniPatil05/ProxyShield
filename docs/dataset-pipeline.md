# Dataset Upload & Inspection Pipeline Documentation

This document describes the design, implementation, temporary file handling, and API contracts for Phase 2: Dataset Upload & Dataset Inspection.

---

## 1. Pipeline Sequence Architecture

```
User Selects CSV (React Frontend)
  ↓ HTTP POST multipart/form-data
Express Backend (Multer CSV Filter)
  ↓ Save temp file to backend/uploads/
FastAPI ML Service (POST /inspect-dataset)
  ↓ Pandas read_csv & metadata extraction
MongoDB Persistence (Save metadata & 10-row preview)
  ↓ Unlink temporary CSV file (Cleanup)
Return Inspection JSON to React UI
```

---

## 2. Temporary File Handling & Security Strategy

1. **File Type Filter**: Multer middleware strictly accepts `.csv` extensions (`text/csv` / `application/vnd.ms-excel`). Unsupported file types (PDF, images, JSON, Excel binary) return an immediate `HTTP 400` validation error.
2. **Temporary Storage**: Uploaded CSV files are temporarily stored in `backend/uploads/` with unique time-stamped names (`dataset-<timestamp>.csv`).
3. **Automatic Cleanup**: Upon completing the FastAPI inspection and MongoDB metadata save operation, the temporary CSV file is deleted via `fs.unlink()` in a `finally` block.
4. **Git Protection**: `backend/uploads/*` is listed in `.gitignore` to prevent raw user datasets from being committed.
5. **Database Protection**: Raw dataset content is **never** saved into MongoDB. Only schema metadata, missing counts, column data types, and a 10-row preview are persisted.

---

## 3. API Contract Specifications

### 3.1 FastAPI Service Inspection Endpoint
- **Endpoint**: `POST /inspect-dataset`
- **Request**: `multipart/form-data` with field `file`
- **Response**:
```json
{
  "success": true,
  "dataset": {
    "name": "Adult_Income_Sample.csv",
    "rows": 10,
    "columns": 12,
    "columnNames": ["age", "workclass", "education", "marital_status", "occupation", "relationship", "race", "sex", "capital_gain", "hours_per_week", "native_country", "income"],
    "dataTypes": {"age": "int64", "workclass": "object"},
    "missingValues": {"workclass": 0},
    "missingPercentage": {"workclass": 0.0},
    "totalMissingValues": 0,
    "duplicateRows": 0,
    "columnDetails": [
      {
        "name": "age",
        "dataType": "int64",
        "missingCount": 0,
        "missingPercentage": 0.0,
        "uniqueCount": 10,
        "isNumeric": true,
        "isCategorical": false,
        "sampleValues": [39, 50, 38, 53, 28]
      }
    ]
  },
  "preview": [
    {
      "age": 39,
      "workclass": "State-gov",
      "income": "<=50K"
    }
  ]
}
```

### 3.2 Express Backend Upload & Inspection Endpoint
- **Endpoint**: `POST /api/datasets/upload`
- **Request**: `multipart/form-data` with field `file` (CSV only)
- **Response Status**: `201 Created`
- **Response Body**:
```json
{
  "success": true,
  "dataset": {
    "id": "66dc8f12a4b8901234567890",
    "name": "Adult_Income_Sample.csv",
    "originalFileName": "Adult_Income_Sample.csv",
    "status": "INSPECTED",
    "createdAt": "2026-09-07T19:30:00.000Z"
  },
  "inspection": { /* full metadata object */ }
}
```

### 3.3 Express Backend Dataset Retrieval Endpoints
- `GET /api/datasets`: Returns array of dataset summaries stored in MongoDB.
- `GET /api/datasets/:id`: Returns full dataset inspection details and row preview by ID.
