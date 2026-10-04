import pandas as pd
import numpy as np
import math
from scipy import stats

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def calculate_categorical_association(series_x: pd.Series, series_a: pd.Series) -> dict:
    """
    Calculates Chi-Square test of independence and Cramér's V for a categorical feature X vs categorical protected attribute A.
    """
    df = pd.DataFrame({'x': series_x, 'a': series_a}).dropna()
    if len(df) == 0:
        return {
            'method': 'cramers_v',
            'value': None,
            'pValue': None,
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Insufficient non-missing paired samples.'
        }

    contingency = pd.crosstab(df['x'], df['a'])
    if contingency.shape[0] < 2 or contingency.shape[1] < 2:
        return {
            'method': 'cramers_v',
            'value': 0.0,
            'pValue': 1.0,
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Feature or protected attribute has only one unique class level in available observations.'
        }

    try:
        chi2, p_val, dof, _ = stats.chi2_contingency(contingency)
        n = contingency.values.sum()
        min_dim = min(contingency.shape[0] - 1, contingency.shape[1] - 1)
        
        if min_dim < 1 or n == 0:
            cramers_v = 0.0
        else:
            cramers_v = np.sqrt(chi2 / (n * min_dim))

        return {
            'method': 'cramers_v',
            'value': clean_float(cramers_v),
            'pValue': clean_float(p_val),
            'status': 'ANALYZED',
            'explanation': f"Cramér's V association metric (chi2={round(chi2, 2)}, dof={dof})."
        }
    except Exception as e:
        return {
            'method': 'cramers_v',
            'value': None,
            'pValue': None,
            'status': 'NOT_APPLICABLE',
            'explanation': f"Statistical test calculation error: {str(e)}"
        }

def calculate_numerical_association(series_x: pd.Series, series_a: pd.Series) -> dict:
    """
    Calculates ANOVA F-test and Correlation Ratio (Eta-squared) for a numerical feature X vs categorical protected attribute A.
    """
    df = pd.DataFrame({'x': pd.to_numeric(series_x, errors='coerce'), 'a': series_a}).dropna()
    if len(df) == 0:
        return {
            'method': 'anova_f_test',
            'value': None,
            'pValue': None,
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Insufficient numeric paired samples.'
        }

    if df['x'].nunique() <= 1:
        return {
            'method': 'anova_f_test',
            'value': 0.0,
            'pValue': 1.0,
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Numerical feature has zero variance across samples.'
        }

    groups = [group['x'].values for _, group in df.groupby('a')]
    if len(groups) < 2:
        return {
            'method': 'anova_f_test',
            'value': 0.0,
            'pValue': 1.0,
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Protected attribute has fewer than 2 categories.'
        }

    try:
        f_stat, p_val = stats.f_oneway(*groups)
        
        # Calculate Eta-squared (Correlation Ratio)
        grand_mean = df['x'].mean()
        ss_total = np.sum((df['x'] - grand_mean) ** 2)
        ss_between = np.sum([len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups])
        
        eta_sq = ss_between / ss_total if ss_total > 0 else 0.0

        return {
            'method': 'anova_f_test',
            'value': clean_float(eta_sq),
            'pValue': clean_float(p_val),
            'status': 'ANALYZED',
            'explanation': f"Correlation Ratio (Eta-squared) from ANOVA F-test (F={round(f_stat, 2)})."
        }
    except Exception as e:
        return {
            'method': 'anova_f_test',
            'value': None,
            'pValue': None,
            'status': 'NOT_APPLICABLE',
            'explanation': f"ANOVA calculation error: {str(e)}"
        }
