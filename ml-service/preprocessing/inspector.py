import pandas as pd
import numpy as np
import io
import math

def clean_json_value(val):
    """
    Converts pandas/numpy NaNs, Infs, NaTs into JSON-safe None/Python primitives.
    """
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    return str(val)

def inspect_csv_bytes(file_bytes: bytes, filename: str) -> dict:
    """
    Inspects a CSV file using Pandas and returns structured dataset & column level metadata.
    """
    if not file_bytes or len(file_bytes.strip()) == 0:
        raise ValueError("Uploaded dataset is empty.")

    try:
        # Try parsing CSV with Pandas
        df = pd.read_csv(
    io.BytesIO(file_bytes),
    na_values=["?"]
)
    except Exception as e:
        raise ValueError(f"Unable to parse CSV file: {str(e)}")

    if df.shape[1] == 0:
        raise ValueError("CSV file contains no columns.")

    rows, cols = df.shape

    # Compute missing values & statistics
    missing_series = df.isnull().sum()
    total_missing = int(missing_series.sum())

    missing_values_dict = {col: int(count) for col, count in missing_series.items()}
    missing_pct_dict = {
        col: round((float(count) / rows * 100), 2) if rows > 0 else 0.0
        for col, count in missing_series.items()
    }

    duplicate_rows = int(df.duplicated().sum())

    # Data types dictionary
    data_types_dict = {col: str(dtype) for col, dtype in df.dtypes.items()}

    # Column-level detailed inspection
    column_details = []
    for col in df.columns:
        col_series = df[col]
        col_dtype = str(col_series.dtype)
        is_num = bool(pd.api.types.is_numeric_dtype(col_series))
        is_cat = not is_num

        missing_cnt = int(col_series.isnull().sum())
        missing_pct = round((missing_cnt / rows * 100), 2) if rows > 0 else 0.0
        unique_cnt = int(col_series.nunique(dropna=True))

        # Sample values (up to 5 unique non-null values)
        non_null_unique = col_series.dropna().unique()
        sample_vals = [clean_json_value(v) for v in non_null_unique[:5]]

        column_details.append({
            "name": col,
            "dataType": col_dtype,
            "missingCount": missing_cnt,
            "missingPercentage": missing_pct,
            "uniqueCount": unique_cnt,
            "isNumeric": is_num,
            "isCategorical": is_cat,
            "sampleValues": sample_vals
        })

    # Dataset Preview (first 10 rows)
    preview_df = df.head(10)
    preview_records = []
    for row_dict in preview_df.to_dict(orient="records"):
        clean_row = {k: clean_json_value(v) for k, v in row_dict.items()}
        preview_records.append(clean_row)

    return {
        "success": True,
        "dataset": {
            "name": filename,
            "rows": rows,
            "columns": cols,
            "columnNames": list(df.columns),
            "dataTypes": data_types_dict,
            "missingValues": missing_values_dict,
            "missingPercentage": missing_pct_dict,
            "totalMissingValues": total_missing,
            "duplicateRows": duplicate_rows,
            "columnDetails": column_details,
        },
        "preview": preview_records
    }
