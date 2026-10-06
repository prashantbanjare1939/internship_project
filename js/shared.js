import { money, monthTotals, summarize } from "./data.js";

export const state = { allData: [], visibleData: [] };
const pageName = () => document.body.dataset.page || "overview";

async function assistantReply(question) {
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    if (!response.ok) throw new Error("Assistant API unavailable");
    const data = await response.json();
    return data.answer;
  } catch {
    const text = question.toLowerCase();
    const info = summarize(state.visibleData);
    const trends = monthTotals(state.visibleData);
    if (/(top|best|category|product)/.test(text)) return `${info.topCategory} is currently the leading category, contributing ${money(info.categories[0]?.revenue)} in selected revenue.`;
    if (/(trend|month|latest|increase|decrease)/.test(text)) {
      if (trends.length < 2) return "There is not enough data in the current view to compare two months.";
      const latest = trends.at(-1); const previous = trends.at(-2); const change = ((latest.revenue - previous.revenue) / Math.max(previous.revenue, 1)) * 100;
      return `Revenue changed ${change >= 0 ? "up" : "down"} by ${Math.abs(change).toFixed(1)}% in ${latest.label} compared with the prior month.`;
    }
    if (/(stock|priority|recommend|action)/.test(text)) return `Start with a stock review for ${info.topCategory}; it is the strongest revenue contributor in the data currently shown. Confirm actual inventory and margin before ordering.`;
    if (/(predict|estimate|scenario)/.test(text)) return "Open Sales predictor to build a quantity-and-price scenario using the trained ML model when the Flask backend is running.";
    return `This ${pageName()} view contains ${info.orders.toLocaleString("en-IN")} transactions worth ${money(info.revenue)}. Ask about categories, trends, stock priorities, or predictions.`;
  }
}
function addBubble(text, kind = "bot") {
  const bubble = document.createElement("p"); bubble.className = `assistant-bubble ${kind}`; bubble.textContent = text; document.querySelector("#assistantChat").append(bubble); document.querySelector("#assistantChat").scrollTop = document.querySelector("#assistantChat").scrollHeight;
}

function injectAssistant() {
  document.body.insertAdjacentHTML("beforeend", `<button class="assistant-launcher" id="assistantLauncher" type="button" aria-label="Open Retail Assistant"><span>✦</span>Ask</button><section class="assistant-panel" id="assistantPanel" aria-label="Retail Insights Assistant"><header class="assistant-head"><div><p>Local assistant</p><h2>Retail copilot</h2></div><button id="closeAssistant" type="button" aria-label="Close assistant">×</button></header><div class="assistant-chat" id="assistantChat"><p class="assistant-bubble bot">Hi! I can analyze the retail data. The backend uses ML analytics and can use GenAI when an API key is configured.</p></div><div class="assistant-prompts"><button type="button" data-prompt="Give me the sales summary">Sales summary</button><button type="button" data-prompt="Which category should we prioritize?">Stock priority</button><button type="button" data-prompt="What is the latest sales trend?">Latest trend</button></div><form class="assistant-form" id="assistantForm"><input id="assistantInput" placeholder="Ask about this data…" required><button>Send</button></form></section>`);
  const panel = document.querySelector("#assistantPanel");
  document.querySelector("#assistantLauncher").addEventListener("click", () => panel.classList.toggle("open"));
  document.querySelector("#closeAssistant").addEventListener("click", () => panel.classList.remove("open"));
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { addBubble(button.dataset.prompt, "user"); addBubble("Analyzing…", "bot"); assistantReply(button.dataset.prompt).then((answer) => { const chat = document.querySelector("#assistantChat"); const bubbles = chat.querySelectorAll(".assistant-bubble.bot"); bubbles[bubbles.length - 1].textContent = answer; chat.scrollTop = chat.scrollHeight; }); }));
  document.querySelector("#assistantForm").addEventListener("submit", (event) => { event.preventDefault(); const input = document.querySelector("#assistantInput"); addBubble(input.value, "user"); addBubble("Analyzing…", "bot"); const question = input.value; assistantReply(question).then((answer) => { const chat = document.querySelector("#assistantChat"); const bubbles = chat.querySelectorAll(".assistant-bubble.bot"); bubbles[bubbles.length - 1].textContent = answer; chat.scrollTop = chat.scrollHeight; }); input.value = ""; });
}

export async function bootPage(setup) {
  injectAssistant();
  try {
    const { loadRetailData } = await import("./data.js");
    state.allData = await loadRetailData(); state.visibleData = state.allData;
    document.querySelectorAll("#dataPill").forEach((element) => { element.textContent = `${state.allData.length.toLocaleString("en-IN")} local transactions`; });
    setup(state.allData);
  } catch (error) {
    document.querySelectorAll("#dataPill").forEach((element) => { element.textContent = "Data unavailable"; });
    document.querySelector(".main-content").insertAdjacentHTML("afterbegin", `<section class="surface"><b>Unable to load the CSV.</b><p class="muted-text">${error.message} Open this project with VS Code Live Server.</p></section>`);
  }
}
