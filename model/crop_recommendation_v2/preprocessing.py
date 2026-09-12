"""Data validation, schema contracts, and preprocessing pipeline for Crop Recommendation Model v2."""

from typing import Dict, Any, List, Union, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL_FEATURES: List[str] = ["state", "district", "soil_type", "previous_crop"]
NUMERICAL_FEATURES: List[str] = ["temperature", "humidity", "rainfall"]
FEATURE_NAMES: List[str] = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
TARGET_NAME: str = "recommended_crop"

ALLOWED_SOIL_TYPES: List[str] = [
    "alluvial",
    "black",
    "red",
    "laterite",
    "clay",
    "sandy",
    "loamy",
    "peaty",
    "saline",
    "arid",
    "unknown"
]

FEATURE_BOUNDS: Dict[str, Tuple[float, float]] = {
    "temperature": (-10.0, 60.0),
    "humidity": (0.0, 100.0),
    "rainfall": (0.0, 5000.0),
}

def create_preprocessing_pipeline() -> ColumnTransformer:
    """Construct Scikit-Learn ColumnTransformer for mixed tabular features.
    
    Categorical features: One-hot encoded with handle_unknown='ignore'.
    Numerical features: Standard scaled.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )
    return preprocessor

def validate_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Validate empirical multi-source dataset schema, missing values, ranges, and target classes."""
    report: Dict[str, Any] = {}
    
    # 1. Schema check
    expected_cols = set(FEATURE_NAMES + [TARGET_NAME])
    actual_cols = set(df.columns)
    missing_cols = expected_cols - actual_cols
    if missing_cols:
        raise ValueError(f"Dataset missing required columns: {sorted(list(missing_cols))}")
        
    report["total_rows_initial"] = len(df)
    report["columns"] = list(df.columns)
    
    # 2. Missing values check
    null_counts = df[FEATURE_NAMES + [TARGET_NAME]].isnull().sum().to_dict()
    report["null_counts"] = null_counts
    total_nulls = sum(null_counts.values())
    if total_nulls > 0:
        raise ValueError(f"Dataset contains null/NaN values: {null_counts}")
        
    # 3. Duplicate check
    duplicate_count = int(df.duplicated(subset=FEATURE_NAMES).sum())
    report["duplicate_feature_rows"] = duplicate_count
    
    # 4. Range and Type validation
    cleaned_df = df.copy()
    for col in NUMERICAL_FEATURES:
        cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors="coerce")
        if cleaned_df[col].isnull().any():
            raise ValueError(f"Non-numeric values in numeric feature column '{col}'")
            
        min_b, max_b = FEATURE_BOUNDS[col]
        out_of_bounds = cleaned_df[(cleaned_df[col] < min_b) | (cleaned_df[col] > max_b)]
        if not out_of_bounds.empty:
            raise ValueError(f"Column '{col}' has values outside valid range [{min_b}, {max_b}]")
            
    for col in CATEGORICAL_FEATURES:
        cleaned_df[col] = cleaned_df[col].astype(str).str.strip().str.title()
        
    # Standardize soil_type and previous_crop
    cleaned_df["soil_type"] = cleaned_df["soil_type"].astype(str).str.strip().str.title()
    cleaned_df["previous_crop"] = cleaned_df["previous_crop"].astype(str).str.strip().str.lower()
    
    # 5. Target validation
    cleaned_df[TARGET_NAME] = cleaned_df[TARGET_NAME].astype(str).str.strip().str.lower()
    unique_classes = sorted(cleaned_df[TARGET_NAME].unique().tolist())
    class_dist = cleaned_df[TARGET_NAME].value_counts().to_dict()
    
    report["num_classes"] = len(unique_classes)
    report["classes"] = unique_classes
    report["class_distribution"] = class_dist
    report["total_samples"] = len(cleaned_df)
    
    return cleaned_df, report

def validate_input(
    state: str,
    district: str,
    temperature: Union[int, float],
    humidity: Union[int, float],
    rainfall: Union[int, float],
    soil_type: str,
    previous_crop: str,
) -> Dict[str, Any]:
    """Validate inference inputs for Model v2."""
    if not state or not isinstance(state, str) or not state.strip():
        raise ValueError("Parameter 'state' must be a non-empty string.")
    if not district or not isinstance(district, str) or not district.strip():
        raise ValueError("Parameter 'district' must be a non-empty string.")
    if not soil_type or not isinstance(soil_type, str) or not soil_type.strip():
        raise ValueError("Parameter 'soil_type' must be a non-empty string.")
    if not previous_crop or not isinstance(previous_crop, str) or not previous_crop.strip():
        raise ValueError("Parameter 'previous_crop' must be a non-empty string.")
        
    # Validate soil type against allowed canonical categories
    norm_soil = soil_type.strip().lower()
    if norm_soil not in ALLOWED_SOIL_TYPES:
        raise ValueError(
            f"Unsupported soil type '{soil_type}'. Allowed types are: {', '.join(ALLOWED_SOIL_TYPES)}"
        )
        
    num_vals = {
        "temperature": temperature,
        "humidity": humidity,
        "rainfall": rainfall,
    }
    
    validated_num: Dict[str, float] = {}
    for key, val in num_vals.items():
        if val is None:
            raise ValueError(f"Missing required numeric parameter '{key}'.")
        try:
            val_f = float(val)
        except (ValueError, TypeError):
            raise ValueError(f"Parameter '{key}' must be numeric, got '{type(val).__name__}': {val}")
            
        if np.isnan(val_f) or np.isinf(val_f):
            raise ValueError(f"Parameter '{key}' cannot be NaN or infinite.")
            
        min_b, max_b = FEATURE_BOUNDS[key]
        if val_f < min_b or val_f > max_b:
            raise ValueError(f"Parameter '{key}' value {val_f} is outside valid physical range [{min_b}, {max_b}].")
            
        validated_num[key] = val_f
        
    return {
        "state": state.strip().title(),
        "district": district.strip().title(),
        "soil_type": soil_type.strip().title(),
        "previous_crop": previous_crop.strip().lower(),
        "temperature": validated_num["temperature"],
        "humidity": validated_num["humidity"],
        "rainfall": validated_num["rainfall"],
    }

def prepare_inference_dataframe(validated_inputs: Dict[str, Any]) -> pd.DataFrame:
    """Format single-record validated dictionary into a pandas DataFrame matching FEATURE_NAMES."""
    return pd.DataFrame([validated_inputs])[FEATURE_NAMES]
