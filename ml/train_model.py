from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "RetailSales.csv"
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_csv(DATA)
df["Date"] = pd.to_datetime(df["Date"], dayfirst=True)
df["Month"] = df["Date"].dt.month
df["DayOfWeek"] = df["Date"].dt.dayofweek
df["DayOfMonth"] = df["Date"].dt.day

# This is a transaction-level sales-value estimator. The source dataset defines
# Total_Sales as Quantity * Price, so the model is intended as an ML integration
# demonstration rather than a demand-forecasting model.
features = ["Quantity", "Price", "Category", "Product_Name", "Month", "DayOfWeek", "DayOfMonth"]
target = "Total_Sales"
X, y = df[features], df[target]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["Category", "Product_Name"]),
    ("num", "passthrough", ["Quantity", "Price", "Month", "DayOfWeek", "DayOfMonth"]),
])
model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1, min_samples_leaf=2)
pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])
pipeline.fit(X_train, y_train)
pred = pipeline.predict(X_test)

metrics = {
    "model": "RandomForestRegressor",
    "target": "Total_Sales",
    "samples": int(len(df)),
    "test_samples": int(len(X_test)),
    "mae": round(float(mean_absolute_error(y_test, pred)), 2),
    "rmse": round(float(mean_squared_error(y_test, pred) ** 0.5), 2),
    "r2": round(float(r2_score(y_test, pred)), 4),
    "features": features,
    "note": "The YBI dataset defines Total_Sales as Quantity × Price, so this model demonstrates an end-to-end ML pipeline rather than independent demand forecasting."
}
joblib.dump(pipeline, MODEL_DIR / "retail_sales_model.joblib")
(MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
print(json.dumps(metrics, indent=2))
