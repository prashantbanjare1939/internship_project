import { money } from "./data.js";
import { bootPage } from "./shared.js";

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "API request failed");
  return response.json();
}

function productsForCategory(data, category) {
  return [...new Set(data.filter((item) => item.category === category).map((item) => item.productName))].sort();
}

function refreshProducts(data) {
  const categorySelect = document.querySelector("#predictionCategory");
  const productSelect = document.querySelector("#predictionProduct");
  const products = productsForCategory(data, categorySelect.value);
  const previous = productSelect.value;
  productSelect.replaceChildren();
  products.forEach((product) => productSelect.add(new Option(product, product)));
  if (products.includes(previous)) productSelect.value = previous;
}

function setPrice(data) {
  const category = document.querySelector("#predictionCategory").value;
  const product = document.querySelector("#predictionProduct").value;
  const rows = data.filter((item) => item.category === category && item.productName === product);
  const source = rows.length ? rows : data.filter((item) => item.category === category);
  if (source.length) {
    document.querySelector("#predictionPrice").value = (source.reduce((sum, item) => sum + item.price, 0) / source.length).toFixed(2);
  }
}

async function estimate() {
  const category = document.querySelector("#predictionCategory").value;
  const product = document.querySelector("#predictionProduct").value;
  const quantity = Number(document.querySelector("#predictionQuantity").value);
  const price = Number(document.querySelector("#predictionPrice").value);
  const result = document.querySelector("#estimateResult");
  result.textContent = "Calculating…";
  try {
    const data = await api("/api/predict", { method: "POST", body: JSON.stringify({ category, product, quantity, price }) });
    result.textContent = money(data.prediction);
    document.querySelector("#estimateExplanation").textContent = `ML estimate for ${quantity} unit${quantity === 1 ? "" : "s"} of ${product} at ${money(price)} each.`;
    document.querySelector("#categoryAdjustment").textContent = `R² ${Number(data.r2).toFixed(4)}`;
    document.querySelector("#estimateAction").textContent = "Use this as an estimated transaction value and validate it against actual sales.";
    document.querySelector("#mlModelName").textContent = data.model;
    document.querySelector("#mlStatus").textContent = "Live ML model";
  } catch {
    const value = quantity * price;
    result.textContent = money(value);
    document.querySelector("#estimateExplanation").textContent = `Preview estimate: ${quantity} unit${quantity === 1 ? "" : "s"} × ${money(price)}. Start Flask to use the trained model.`;
    document.querySelector("#categoryAdjustment").textContent = "Preview mode";
    document.querySelector("#estimateAction").textContent = "Run python app.py to enable live ML prediction.";
    document.querySelector("#mlStatus").textContent = "Preview fallback";
  }
}

bootPage(async (data) => {
  const categories = [...new Set(data.map((item) => item.category))].sort();
  const categorySelect = document.querySelector("#predictionCategory");
  const productSelect = document.querySelector("#predictionProduct");
  categories.forEach((category) => categorySelect.add(new Option(category, category)));

  const syncCategory = () => {
    refreshProducts(data);
    setPrice(data);
    estimate();
  };
  categorySelect.addEventListener("change", syncCategory);
  productSelect.addEventListener("change", () => { setPrice(data); estimate(); });
  document.querySelector("#estimateButton").addEventListener("click", estimate);
  ["#predictionQuantity", "#predictionPrice"].forEach((selector) => document.querySelector(selector).addEventListener("input", estimate));

  syncCategory();
  try {
    const metrics = await api("/api/metrics");
    document.querySelector("#mlModelName").textContent = metrics.model;
    document.querySelector("#mlR2").textContent = Number(metrics.r2).toFixed(4);
    document.querySelector("#mlMAE").textContent = money(metrics.mae);
    document.querySelector("#mlStatus").textContent = "Trained & evaluated";
  } catch {
    // The dashboard remains usable without Flask.
    document.querySelector("#mlStatus").textContent = "Preview mode";
  }
});
