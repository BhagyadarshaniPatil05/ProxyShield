# ProxyShield 🛡️
> **A Framework for Detecting and Mitigating Proxy Bias in AI Systems**

ProxyShield is an offline AI auditing and decision-support framework designed for supervised machine-learning models trained on structured datasets. It helps data scientists, auditors, and compliance officers detect potential proxy variables, analyze whether models rely on them, evaluate associated fairness disparities, test feature interventions, compare fairness-utility trade-offs, and generate comprehensive audit evidence for human review.

---

## 🔬 Core Research Methodology

ProxyShield strictly follows a structured 6-stage research methodology:

```
Proxy Capacity → Proxy Use → Fairness Impact → Proxy Intervention → Fairness–Utility Trade-off → Human Review
```

1. **Proxy Capacity**: Evaluates how strongly non-protected dataset features predict protected attributes (e.g., race, gender, age) using information-theoretic metrics such as Mutual Information and conditional association.
2. **Proxy Use**: Measures whether the trained predictive model actually relies on these high-capacity proxy features using model-agnostic explainability methods (SHAP feature importance & dependence).
3. **Fairness Impact**: Assesses baseline group fairness disparities across protected groups (Demographic Parity, Equalized Odds, Disparate Impact Ratio) under the model's predictions.
4. **Proxy Intervention**: Simulates feature mitigation strategies (e.g., feature removal/ablation, threshold adjustments, or constrained re-training) to remove proxy reliance.
5. **Fairness–Utility Trade-off**: Quantifies performance retention (Accuracy, ROC-AUC, F1 Score) versus fairness gains across baseline and post-intervention models.
6. **Human Review**: Presents clear, auditable evidence and visual metrics enabling domain experts to make informed decisions on model deployment or revision.

---

## 🏗️ Architecture

ProxyShield uses a decoupled three-tier architecture ensuring strict isolation between user interface, API business logic, and analytical ML calculations:

```
React Frontend (Vite + Tailwind CSS)
       ↓  (HTTP / REST API)
Node.js + Express Backend
       ├── MongoDB (Metadata & Audit Persistence)
       ↓  (HTTP / Axios)
Python FastAPI ML Service (SHAP, Fairlearn, Scikit-learn, Pandas)
```

- **React Frontend**: User interface for dataset upload, audit configuration, interactive visualization, and audit review. Does **not** communicate directly with the Python ML service.
- **Node.js / Express Backend**: Handles HTTP requests, file uploads, MongoDB storage, task orchestration, and error handling. Does **not** perform ML calculations.
- **Python FastAPI Service**: Executes all ML calculations, feature capacity analysis, SHAP explainability, fairness metrics evaluation, and intervention simulation.
- **MongoDB**: Persists dataset metadata, audit configurations, user profiles, and audit results.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, Multer, Axios, dotenv, CORS |
| **ML Service** | Python 3.10+, FastAPI, Uvicorn, Pandas, NumPy, Scikit-learn, Fairlearn, SHAP |

---

## 📁 Folder Structure

```
ProxyShield/
│
├── frontend/             # React application (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/   # Reusable UI components (Navbar, Card, Button, etc.)
│   │   ├── pages/        # Application views (Landing, Dashboard, Upload, Audit, Results)
│   │   ├── services/     # API integration services (Axios client)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── charts/       # Data visualization components
│   │   ├── utils/        # Helper functions
│   │   └── App.jsx       # Main App component & router configuration
│   └── package.json
│
├── backend/              # Node.js Express API server
│   ├── controllers/      # Route controllers (Health, Dataset, Audit)
│   ├── routes/           # API route definitions
│   ├── models/           # Mongoose schemas (User, Dataset, Audit)
│   ├── services/         # External integrations (ML service proxy)
│   ├── middleware/       # Express middlewares (Error handling, Uploads)
│   ├── config/           # Database & server configuration
│   ├── uploads/          # Temporary file storage
│   ├── server.js         # Entry point for backend server
│   └── package.json
│
├── ml-service/           # Python FastAPI ML analytics engine
│   ├── app/
│   │   ├── main.py       # FastAPI application entry point & health endpoints
│   │   ├── schemas.py    # Pydantic models for request/response schemas
│   │   └── config.py     # ML service environment configuration
│   ├── preprocessing/    # Data cleaning & encoding modules (Phase 2+)
│   ├── models/           # Model training & inference modules (Phase 2+)
│   ├── proxy/            # Proxy capacity evaluation (Phase 2+)
│   ├── fairness/         # Fairness disparity evaluation (Phase 2+)
│   ├── explainability/   # SHAP explainability modules (Phase 2+)
│   ├── intervention/     # Proxy mitigation & ablation modules (Phase 2+)
│   ├── evaluation/       # Utility & trade-off evaluation (Phase 2+)
│   ├── utils/            # Helper utilities
│   └── requirements.txt  # Python package dependencies
│
├── data/
│   ├── sample/           # Sample benchmark datasets (e.g. Adult Income, German Credit)
│   └── temp/             # Temporary dataset storage
│
├── reports/              # Generated audit PDF/JSON reports
│
├── tests/                # Test suites
│   ├── frontend/         # Frontend unit & component tests
│   ├── backend/          # Backend API tests
│   ├── ml/               # Python ML unit tests
│   └── integration/      # End-to-end integration tests
│
├── docs/                 # Documentation
│   ├── architecture.md   # Architectural design details
│   ├── methodology.md    # Methodology breakdown & metrics
│   ├── api.md            # API documentation
│   └── testing.md        # Testing strategy & instructions
│
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start & Environment Setup

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.10 or higher
- **MongoDB**: Running instance locally (`mongodb://localhost:27017`) or MongoDB Atlas

---

### 2. Python FastAPI ML Service Setup

```bash
cd ml-service

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
ML Service Health Check: `http://localhost:8000/health`

---

### 3. Node.js Express Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Start Node backend server
npm run dev
# or node server.js
```
Backend Health Check: `http://localhost:5000/api/health`  
ML Integration Check: `http://localhost:5000/api/ml/health`

---

### 4. React Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Start Vite React development server
npm run dev
```
Frontend Web UI: `http://localhost:5173`

---

## 🔑 Environment Variables Configuration

### `backend/.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/proxyshield
ML_SERVICE_URL=http://localhost:8000
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```

### `ml-service/.env`
```env
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8000
```

---

## 🔒 Security & Operational Notice

ProxyShield is designed as an **offline AI auditing framework**. It operates in isolated environments to evaluate dataset sensitivity, model explainability, and fairness disparities without transmitting raw training data to external third-party APIs.
