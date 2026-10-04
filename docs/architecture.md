# ProxyShield System Architecture

This document describes the architectural design, component separation, communication protocols, and data flow of the ProxyShield AI auditing framework.

---

## 1. High-Level Architecture Overview

ProxyShield is built using a strict three-tier modular architecture:

```
+-------------------------------------------------------------------+
|                        React Frontend Tier                        |
|   (Vite + React 18 + Tailwind CSS + React Router + Recharts)      |
+-------------------------------------------------------------------+
                                  |
                                  |  HTTP / REST API (JSON)
                                  v
+-------------------------------------------------------------------+
|                     Node.js / Express Backend                     |
|    - Express Controllers & Routes                                 |
|    - Mongoose Models (User, Dataset, Audit)                       |
|    - ML Proxy Service (Axios Client)                              |
|    - Multer Dataset Storage                                       |
+-------------------------------------------------------------------+
          |                                       |
          | Mongoose / Native                     | HTTP / REST API (JSON)
          v                                       v
+-----------------------+              +----------------------------+
|   MongoDB Database    |              |   Python FastAPI Service   |
| (Metadata & Audits)   |              |  - Data Preprocessing      |
+-----------------------+              |  - Proxy Capacity Engine   |
                                       |  - SHAP Explainability     |
                                       |  - Fairlearn Evaluation    |
                                       |  - Intervention Simulation |
                                       +----------------------------+
```

---

## 2. Tier Responsibilities & Constraints

### 2.1 React Frontend
- **Responsibilities**:
  - Provides a cybersecurity/Responsible-AI styled user interface.
  - Manages navigation across Landing Page, Dashboard, Dataset Upload, Audit Configuration, and Audit Results.
  - Displays interactive charts (Recharts) for proxy capacity, feature importance, fairness metrics, and trade-off curves.
- **Constraints**:
  - React **must NOT** communicate directly with the Python FastAPI ML service.
  - All communication is routed exclusively through the Node/Express backend (`http://localhost:5000/api`).

### 2.2 Node.js / Express Backend
- **Responsibilities**:
  - Exposes REST API endpoints (`/api/health`, `/api/ml/health`, `/api/datasets`, `/api/audits`).
  - Handles dataset uploads, storage, and validation metadata extraction.
  - Manages database persistence via Mongoose.
  - Proxies analytical and ML requests to the Python FastAPI ML Service.
- **Constraints**:
  - Node/Express **must NOT** perform ML calculations, SHAP analysis, mutual information, or model training.
  - Does not hardcode MongoDB credentials; reads `MONGODB_URI` from environment variables.

### 2.3 Python FastAPI ML Service
- **Responsibilities**:
  - Serves high-performance Python analytical endpoints (`/health`, `/api/v1/proxy-capacity`, `/api/v1/explainability`, `/api/v1/fairness`, `/api/v1/intervention`).
  - Performs data preprocessing, encoding, model training, SHAP feature importance calculation, fairness metric scoring, and intervention simulation.
- **Constraints**:
  - Operates as a stateless execution service.
  - Does not directly interact with the MongoDB database or user authentication logic.

---

## 3. Database Schema Overview (MongoDB)

- **`User` Collection**: User authentication metadata (username, email, role, timestamps).
- **`Dataset` Collection**: Dataset file metadata (name, filename, file path, rows, columns, data types, missing values status).
- **`Audit` Collection**: Audit run configurations and result summaries (target attribute, protected attribute, model type, status, execution timestamps).

---

## 4. Communication Protocol & Health Check Relay

When a user views system health on the React Dashboard:
1. React issues `GET /api/ml/health` to Express (`http://localhost:5000`).
2. Express `mlService.js` issues `GET /health` to FastAPI (`http://localhost:8000`).
3. FastAPI responds with `{"status": "ok", "service": "ProxyShield ML Service"}`.
4. Express relays the status response back to React.
