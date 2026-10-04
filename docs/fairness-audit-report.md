# ProxyShield — AI Fairness Audit Report Generation Technical Specification

## 1. Overview & Research Objective

Phase 13 of **ProxyShield** implements the **AI Fairness Audit Report Generation** stage. The primary objective is to transform the empirical evidence gathered across Phases 2–12 into a structured, evidence-based, professional report suitable for academic project demonstration, faculty review, viva, research documentation, and human governance.

### Core Guiding Principles

1. **Strict Evidence Consumption**:
   Report generation is an aggregation and rendering phase. It introduces **no new ML experiments**. It does NOT retrain models, alter splits, recompute SHAP/ablation metrics, or perform new interventions. It consumes stored evidence directly from the MongoDB `Audit` document.

2. **Zero Single-Composite Scores**:
   To preserve analytical transparency across distinct fairness and predictive performance dimensions, no composite "fairness score" or "utility score" is calculated.

3. **Responsible AI & Non-Causal Framing**:
   All findings are presented as analytical decision-support evidence. The report explicitly distinguishes between:
   - $\text{Proxy Capacity} \neq \text{Proxy Use}$
   - $\text{Proxy Use} \neq \text{Proof of Discrimination}$
   - $\text{Fairness Metric Shift} \neq \text{Causal Proof}$

---

## 2. 17 Structured Report Sections

The generated report contains the following 17 sections:

1. **Executive Summary**: High-level narrative of audit scope, candidate proxy evidence, intervention strategy, before/after results, and fairness-utility outcome classification.
2. **Audit Scope**: Audit ID, dataset parameters, target attribute ($y$), protected attribute ($A$), model type, train/test split (`80/20 Stratified`), random seed (`42`), reference group, and SHA-256 dataset fingerprint.
3. **Dataset Summary**: Number of rows, columns, target/protected attribute stats, missing values, duplicates, data types.
4. **Baseline Model Performance**: Classification accuracy, precision, recall, F1-score, ROC-AUC, and baseline confusion matrix.
5. **Baseline Fairness Analysis**: Group statistics (selection rates, TPR, FPR, TNR, FNR) and disparity metrics (DPD, DI, EOD, Equalized Odds TPR/FPR differences).
6. **Proxy Capacity Analysis**: Candidate feature ranking, association statistics ($\chi^2$/Cramér's V, ANOVA/Eta-squared), mutual information, predictability metrics, and capacity levels (`HIGH`, `MEDIUM`, `LOW`, `NONE`).
7. **Proxy Use Analysis**: SHAP importance, permutation $\Delta F1$, ablation $\Delta F1$, prediction change rate, and model reliance evidence (`HIGH`, `MODERATE`, `MIXED`, `NEGLIGIBLE`).
8. **Controlled Feature Ablation**: Baseline vs ablated performance, metric deltas, prediction change rate, selection rate shifts.
9. **Fairness Impact Analysis**: Feature-level baseline vs ablated fairness metrics (DPD, DI, EOD) and direction-aware analytical observations.
10. **Proxy Intervention**: Recommendation rationale, selected strategy (`REMOVE_FEATURE`), selected proxy features, evidence summary, and human review status.
11. **Mitigated Model Evaluation**: Retrained model configuration, performance metrics (accuracy, precision, recall, F1, ROC-AUC), feature count reduction, and confusion matrix.
12. **Before vs After Controlled Comparison**: Side-by-side predictive performance and fairness disparity comparison tables, deltas, and directional interpretations.
13. **Fairness–Utility Trade-off Analysis**: Trade-off outcome classification (e.g. `NO MATERIAL CHANGE`), configured threshold ($\pm 0.01$), metric movement counts, and dynamic overall interpretation.
14. **Reproducibility & Audit Provenance**: SHA-256 fingerprint, canonical experiment module (`ml-service/evaluation/experiment.py`), strict feature scoping rule (excluding $A$ and $y$ from $X$), 100% prediction match status, and historical baseline correction documentation.
15. **Responsible AI & Limitations**: Legal, ethical, and causal disclaimers framing audit findings for human governance.
16. **Human Review Recommendation**: Evidence summary highlighting proxy candidates, model reliance features, intervention outcome, and mandatory human review statement.
17. **Final Audit Conclusion**: Dynamically generated factual conclusion synthesizing all empirical findings.

---

## 3. Data Flow & API Specifications

```text
MongoDB Audit Document
      ↓
reportService.js (Readiness Validation)
      ↓
POST http://localhost:8000/generate-report
      ↓
generator.py (build_report_data_model & render_html_report)
      ↓
Audit.reportResult (JSON Report Model + Standalone HTML)
```

### API Endpoints

- **`POST /api/audits/:id/report`**: Triggers report generation. Returns JSON containing `status: 'REPORT_GENERATED'`, `reportResult`.
- **`GET /api/audits/:id/report`**: Retrieves JSON report data model.
- **`GET /api/audits/:id/report/html`**: Renders printable, styled HTML report directly in the browser (`Content-Type: text/html`).

---

## 4. Pipeline Readiness Check

Report generation validates that all preceding analysis phases (Phases 3–12) have completed:

- Phase 3: Baseline Model Training (`baselineResult`)
- Phase 4: Baseline Fairness Analysis (`fairnessResult`)
- Phase 5: Proxy Capacity Analysis (`proxyCapacityResult`)
- Phase 6: Proxy Use Analysis (`proxyUseResult`)
- Phase 7: Controlled Feature Ablation (`featureAblationResult`)
- Phase 8: Fairness Impact Analysis (`fairnessImpactResult`)
- Phase 9: Proxy Intervention Configuration (`interventionResult`)
- Phase 10: Mitigated Model Training (`mitigatedModelResult`)
- Phase 11: Before vs After Comparison (`beforeAfterResult`)
- Phase 12: Fairness–Utility Trade-off Analysis (`fairnessUtilityResult`)

If any phase is missing, the API returns `status: 'REPORT_NOT_READY'` with HTTP 400 listing missing phases.

---

## 5. Audit Provenance & Historical Correction Documentation

The report explicitly documents the baseline experiment reproducibility correction:

> **Historical Baseline Consistency Correction**: Earlier implementations included protected attribute `sex` in model features $X$ (15 features) during Phase 4/8, whereas Phase 11/12 excluded it (14 features). Refactoring all pipeline endpoints to consume `get_canonical_experiment(...)` enforced strict feature scoping ($X = \text{Dataset} \setminus \{y, A\}$), achieving **100% bitwise prediction identity (0 mismatches)** across all baseline evaluations.
