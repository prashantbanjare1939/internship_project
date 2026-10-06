export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function parseDate(value) {
  const [day, month, year] = value.trim().split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function loadRetailData() {
  const response = await fetch("data/RetailSales.csv");
  if (!response.ok) throw new Error("The included RetailSales.csv file could not be loaded.");
  const lines = (await response.text()).trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    const source = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));
    return { invoiceId: source.Invoice_ID, customerId: source.Customer_ID, productName: source.Product_Name, category: source.Category, quantity: Number(source.Quantity), price: Number(source.Price), totalSales: Number(source.Total_Sales), date: parseDate(source.Date) };
  }).filter((item) => Number.isFinite(item.totalSales) && !Number.isNaN(item.date.getTime()));
}

export function groupBySum(data, key) {
  const groups = new Map();
  data.forEach((item) => { const existing = groups.get(item[key]) || { label: item[key], revenue: 0, units: 0 }; existing.revenue += item.totalSales; existing.units += item.quantity; groups.set(item[key], existing); });
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
}

export function monthTotals(data) {
  const map = new Map();
  data.forEach((item) => { const label = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`; map.set(label, (map.get(label) || 0) + item.totalSales); });
  return [...map.entries()].map(([label, revenue]) => ({ label, revenue })).sort((a, b) => a.label.localeCompare(b.label));
}

export function summarize(data) {
  const revenue = data.reduce((total, item) => total + item.totalSales, 0);
  const categories = groupBySum(data, "category");
  return { revenue, orders: data.length, average: revenue / Math.max(data.length, 1), categories, topCategory: categories[0]?.label || "—" };
}

export function filterRetailData(data, { start, end, category = "All" }) {
  return data.filter((item) => (!start || item.date >= start) && (!end || item.date <= end) && (category === "All" || item.category === category));
}
