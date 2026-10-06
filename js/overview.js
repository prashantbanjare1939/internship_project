import { groupBySum, monthTotals, money, summarize } from "./data.js";
import { bootPage, state } from "./shared.js";

let trendChart;
function render(data) {
  state.visibleData = data;
  const info = summarize(data);
  document.querySelector("#totalRevenue").textContent = money(info.revenue);
  document.querySelector("#orderCount").textContent = info.orders.toLocaleString("en-IN");
  document.querySelector("#averageOrder").textContent = money(info.average);
  document.querySelector("#topCategory").textContent = info.topCategory;
  document.querySelector("#heroTransactions").textContent = state.allData.length.toLocaleString("en-IN");
  const leader = info.categories[0];
  document.querySelector("#focusTitle").textContent = `${leader.label} is your strongest category`;
  document.querySelector("#focusText").textContent = `It accounts for ${((leader.revenue / info.revenue) * 100).toFixed(1)}% of the revenue in this view. Review availability first, then test a small upsell.`;
  const monthly = monthTotals(data); trendChart?.destroy();
  trendChart = new Chart(document.querySelector("#overviewTrend"), { type: "line", data: { labels: monthly.map((item) => item.label), datasets: [{ data: monthly.map((item) => item.revenue), borderColor: "#4269e8", backgroundColor: "#4269e8", pointRadius: 3, tension: .35, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => money(item.raw) } } }, scales: { y: { grid: { color: "#edf0f5" }, ticks: { callback: (value) => `₹${value}` } }, x: { grid: { display: false } } } } });
  const products = groupBySum(data, "productName").slice(0, 6); const table = document.querySelector("#topProducts"); table.innerHTML = "";
  products.forEach((product) => { const row = data.find((item) => item.productName === product.label); table.insertAdjacentHTML("beforeend", `<tr><td><b>${product.label}</b></td><td>${row.category}</td><td class="text-right">${money(product.revenue)}</td><td class="text-right">${product.units}</td></tr>`); });
}

bootPage((data) => { const select = document.querySelector("#overviewCategory"); [...new Set(data.map((item) => item.category))].sort().forEach((category) => select.add(new Option(category, category))); select.addEventListener("change", () => render(select.value === "All" ? data : data.filter((item) => item.category === select.value))); render(data); });
