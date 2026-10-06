import { monthTotals, money, summarize } from "./data.js";
import { bootPage, state } from "./shared.js";

function buildPlan() {
  const info = summarize(state.allData); const leader = info.categories[0]; const low = info.categories.at(-1); const trends = monthTotals(state.allData); const latest = trends.at(-1); const previous = trends.at(-2); const change = ((latest.revenue - previous.revenue) / Math.max(previous.revenue, 1)) * 100;
  document.querySelector("#priorityHeadline").textContent = `Prioritize ${leader.label} for a stock review`;
  document.querySelector("#priorityText").textContent = `${leader.label} contributes ${((leader.revenue / info.revenue) * 100).toFixed(1)}% of total revenue. Confirm on-hand quantity and margin, then consider a small upsell campaign.`;
  const actions = [
    ["01", "Protect the leader", `${leader.label} leads the sales mix with ${money(leader.revenue)} in revenue. Keep it available and review its best-selling products.`, "Why this works", "High revenue signals customer demand. The recommendation is a review step, not an automatic purchase order."],
    ["02", "Investigate the gap", `${low.label} has the lowest revenue contribution. Test one change in visibility, bundling, or promotion before increasing inventory.`, "What to test", "Try a limited campaign and compare its next-month performance with the current baseline."],
    ["03", "Monitor momentum", `Latest month revenue is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% versus the previous month.`, "How to use it", "Use this trend as an attention signal; combine it with inventory, margins, and seasonality before taking action."],
  ];
  const root = document.querySelector("#actionCards"); root.innerHTML = ""; actions.forEach((action) => root.insertAdjacentHTML("beforeend", `<article class="action-card"><span class="action-number">ACTION ${action[0]}</span><h2>${action[1]}</h2><p>${action[2]}</p><button type="button">${action[3]} →</button><div class="action-detail">${action[4]}</div></article>`)); root.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => button.nextElementSibling.classList.toggle("visible")));
}

bootPage(() => { buildPlan(); document.querySelector("#refreshPlan").addEventListener("click", buildPlan); document.querySelectorAll(".accordion-toggle").forEach((button) => button.addEventListener("click", () => { const detail = document.querySelector(`#${button.dataset.target}`); detail.classList.toggle("open"); button.querySelector("b").textContent = detail.classList.contains("open") ? "−" : "+"; })); });
