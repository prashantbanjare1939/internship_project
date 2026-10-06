from pathlib import Path
import json
import os
import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
CORS(app)

DATA_PATH = ROOT / "data" / "RetailSales.csv"
MODEL_PATH = ROOT / "models" / "retail_sales_model.joblib"
METRICS_PATH = ROOT / "models" / "metrics.json"
MODEL = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
METRICS = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}


def data_frame():
    df = pd.read_csv(DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"], dayfirst=True)
    return df


def model_row(category, product, quantity, price, date):
    dt = pd.to_datetime(date)
    return pd.DataFrame([{
        "Quantity": float(quantity),
        "Price": float(price),
        "Category": category,
        "Product_Name": product,
        "Month": int(dt.month),
        "DayOfWeek": int(dt.dayofweek),
        "DayOfMonth": int(dt.day),
    }])


@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(ROOT, path)


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "ml_model": MODEL is not None,
        "genai": bool(os.getenv("OPENAI_API_KEY")),
        "model": METRICS.get("model", "Unavailable"),
    })


@app.get("/api/metrics")
def metrics():
    return jsonify(METRICS)


@app.post("/api/predict")
def predict():
    if MODEL is None:
        return jsonify({"error": "ML model is not available. Run: python ml/train_model.py"}), 500
    body = request.get_json(silent=True) or {}
    try:
        category = str(body["category"])
        product = str(body.get("product", "Tablet"))
        quantity = float(body["quantity"])
        price = float(body["price"])
        date = body.get("date") or pd.Timestamp.today().strftime("%Y-%m-%d")
        if quantity <= 0 or price <= 0:
            raise ValueError("Quantity and price must be positive.")
        prediction = float(MODEL.predict(model_row(category, product, quantity, price, date))[0])
        return jsonify({"prediction": round(max(prediction, 0), 2), "model": METRICS.get("model"), "r2": METRICS.get("r2")})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/segments")
def segments():
    df = data_frame()
    customer = df.groupby("Customer_ID").agg(
        purchases=("Invoice_ID", "count"),
        revenue=("Total_Sales", "sum"),
        units=("Quantity", "sum"),
        avg_order_value=("Total_Sales", "mean"),
    ).reset_index()
    matrix = StandardScaler().fit_transform(customer[["purchases", "revenue", "units", "avg_order_value"]])
    km = KMeans(n_clusters=4, random_state=42, n_init=20)
    customer["cluster"] = km.fit_predict(matrix)
    ranking = customer.groupby("cluster")["revenue"].mean().sort_values(ascending=False)
    names = {cluster: label for cluster, label in zip(ranking.index, ["High Value", "Regular", "Occasional", "Low Value"])}
    customer["segment"] = customer["cluster"].map(names)
    summary = customer.groupby("segment").agg(
        customers=("Customer_ID", "count"), revenue=("revenue", "sum"), avg_order_value=("avg_order_value", "mean")
    ).reset_index().sort_values("revenue", ascending=False)
    return jsonify(summary.round(2).to_dict(orient="records"))


@app.post("/api/assistant")
def assistant():
    body = request.get_json(silent=True) or {}
    question = str(body.get("question", "")).strip()
    if not question:
        return jsonify({"error": "Question is required."}), 400

    df = data_frame()
    category = df.groupby("Category")["Total_Sales"].agg(["sum", "count"]).sort_values("sum", ascending=False)
    monthly = df.groupby(df["Date"].dt.to_period("M"))["Total_Sales"].sum().sort_index()
    context = {
        "transactions": int(len(df)),
        "revenue": round(float(df["Total_Sales"].sum()), 2),
        "top_category": str(category.index[0]),
        "category_revenue": {str(k): round(float(v), 2) for k, v in category["sum"].items()},
        "latest_month": str(monthly.index[-1]),
        "latest_month_revenue": round(float(monthly.iloc[-1]), 2),
        "previous_month_revenue": round(float(monthly.iloc[-2]), 2),
        "ml_model": METRICS.get("model"),
        "ml_r2": METRICS.get("r2"),
    }

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.responses.create(
                model=os.getenv("OPENAI_MODEL", "gpt-6-luna"),
                instructions=(
                    "You are RetailOS Copilot, a concise retail business analyst. "
                    "Use only the supplied dataset context. Never invent metrics. "
                    "Explain findings clearly and give practical recommendations. "
                    "Mention when a conclusion is only a correlation or estimate."
                ),
                input=f"Dataset context:\n{json.dumps(context, indent=2)}\n\nUser question: {question}",
            )
            return jsonify({"answer": response.output_text, "mode": "GenAI"})
        except Exception as exc:
            return jsonify({"answer": f"GenAI connection failed, so I switched to the local analytics assistant. ({exc})", "mode": "Local fallback"})

    latest_change = ((context["latest_month_revenue"] - context["previous_month_revenue"]) / max(context["previous_month_revenue"], 1)) * 100
    q = question.lower()
    if any(x in q for x in ["top", "best", "category"]):
        answer = f"{context['top_category']} is the highest-revenue category, contributing ₹{context['category_revenue'][context['top_category']]:,.0f} in the dataset."
    elif any(x in q for x in ["trend", "month", "increase", "decrease"]):
        answer = f"Revenue changed {latest_change:+.1f}% in {context['latest_month']} versus the previous month."
    elif any(x in q for x in ["model", "accuracy", "prediction", "r2"]):
        answer = f"RetailOS uses {context['ml_model']} for transaction-level sales prediction. Its held-out test R² is {context['ml_r2']:.4f}."
    elif any(x in q for x in ["stock", "recommend", "action", "focus"]):
        answer = f"Start by reviewing {context['top_category']} inventory and promotion strategy because it is currently the strongest revenue category. Validate margins and stock levels before making purchasing decisions."
    else:
        answer = f"The dataset contains {context['transactions']:,} transactions worth ₹{context['revenue']:,.0f}. The leading category is {context['top_category']}. Add an OpenAI API key to enable full GenAI answers."
    return jsonify({"answer": answer, "mode": "Local fallback"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"RetailOS running at http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
