# ProxyShield — MongoDB Removal & Local Filesystem Persistence Audit

## Executive Summary

To eliminate runtime fragility, MongoDB Windows service authentication locks (`MongoServerError: Command find requires authentication`), port collisions (27017 vs 27018), and Mongoose schema serialization failures on dot-notated column names (`Cast to Map failed`), the ProxyShield architecture has been completely migrated to a high-performance, collision-free local filesystem persistence model.

**MongoDB is no longer required to run the ProxyShield application.**

---

## 1. Architectural Changes

### 1.1 Local Storage Layout
ProxyShield now uses atomic JSON metadata persistence and raw CSV storage directly in the repository filesystem:

```text
ProxyShield/
└── data/
    └── temp/
        ├── datasets/   # Raw uploaded CSV dataset files (<id>.csv)
        ├── metadata/   # Parsed schema & inspection metadata (<id>.json)
        └── audits/     # Full audit pipeline lifecycle state records (<id>.json)
```

### 1.2 Storage Service (`backend/services/storageService.js`)
All CRUD operations for datasets and audit configurations/results are handled by `storageService`:
- **Collision-free 24-character hexadecimal IDs** generated via `crypto.randomBytes(12).toString('hex')`.
- Full backwards-compatibility with Mongoose-style `.save()` lifecycle hooks and `.id`/`._id` accessors.
- Atomic read/write operations using UTF-8 JSON files.
- Transparent population of associated dataset objects in audit queries.
- Zero external database daemon dependencies.

---

## 2. Issues Resolved

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **MongoDB Auth Lock** | MongoDB Windows service had `authorization: enabled` on port 27017, rejecting unauthenticated queries. | Completely removed MongoDB and Mongoose connection requirements. |
| **Dot-Notated Columns** | Mongoose Map schema failed when parsing column names containing periods (`education.num`, `marital.status`, `capital.gain`, `hours.per.week`). | Native JSON serialization supports arbitrary Unicode and dot-notated keys without casting errors. |
| **Missing Values `?`** | Adult dataset uses `?` for missing values, which failed numeric coercion. | Configured Pandas `na_values=["?"]` across all ML service endpoints and dataset inspectors. |
| **Object Object UI Errors** | Axios error objects rendered directly as React nodes. | Added defensive string coercion and error extraction in `api.js` and `ErrorMessage.jsx`. |

---

## 3. Controller & Model Adaptations

The following backend components were refactored to use `storageService`:
1. `backend/server.js`: Removed `connectDB()` invocation; initialized local directories.
2. `backend/config/db.js`: Replaced with an informational no-op stub.
3. `backend/models/Dataset.js`: Converted into a storage adapter.
4. `backend/models/Audit.js`: Converted into a storage adapter.
5. `backend/models/User.js`: Converted into a clean, independent model.
6. `backend/controllers/datasetController.js`
7. `backend/controllers/auditController.js`
8. `backend/controllers/fairnessController.js`
9. `backend/controllers/proxyController.js`
10. `backend/controllers/proxyUseController.js`
11. `backend/controllers/ablationController.js`
12. `backend/controllers/fairnessImpactController.js`
13. `backend/controllers/interventionController.js`
14. `backend/controllers/mitigatedModelController.js`
15. `backend/controllers/beforeAfterController.js`
16. `backend/controllers/fairnessUtilityController.js`
17. `backend/controllers/reportController.js`

---

## 4. Verification

The entire 13-phase audit pipeline was executed without MongoDB running:
1. Dataset Upload & Multi-type Inspection
2. Audit Configuration Creation
3. Phase 3: Baseline Model Training
4. Phase 4: Baseline Fairness Analysis
5. Phase 5: Proxy Capacity Analysis
6. Phase 6: Proxy Use / Model Reliance Analysis
7. Phase 7: Controlled Feature Ablation
8. Phase 8: Fairness Impact Analysis
9. Phase 9: Proxy Intervention Analysis
10. Phase 10: Mitigated Model Retraining
11. Phase 11: Before vs After Controlled Comparison
12. Phase 12: Fairness–Utility Trade-off Analysis
13. Phase 13: AI Fairness Audit Report Generation (JSON & HTML)

All test suites passed with 100% real computed metrics.
