import { friendlyError, isConfigured, requireSupabase } from "./supabase-client.js";

const container = document.getElementById("home-capabilities-list");

const fallbackItems = [
  {
    title: "Prototype-to-Validation Pipeline",
    body: "Concept design, embedded integration, and iterative experimental validation in one workflow."
  },
  {
    title: "Data-Driven Engineering Decisions",
    body: "Sensor and control data are used to continuously refine system performance and robustness."
  },
  {
    title: "Cross-Disciplinary Translation",
    body: "Bridging robotics, AI, and clinical use-cases to move innovations toward practical deployment."
  }
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildItems(rows) {
  const map = new Map();
  const pattern = /^home\.capability\.(\d+)\.(title|body)$/;

  rows.forEach((row) => {
    const key = String(row?.key || "");
    const match = key.match(pattern);
    if (!match) return;

    const index = Number(match[1]);
    const field = match[2];
    if (!map.has(index)) {
      map.set(index, { title: "", body: "" });
    }

    map.get(index)[field] = String(row?.value || "").trim();
  });

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value)
    .filter((item) => item.title || item.body);
}

function render(items) {
  if (!container) return;
  const list = items.length ? items : fallbackItems;
  container.innerHTML = list
    .map(
      (item) => `
        <div class="home-capability">
          <h3>${escapeHtml(item.title || "")}</h3>
          <p>${escapeHtml(item.body || "")}</p>
        </div>
      `
    )
    .join("");
}

async function loadCapabilities() {
  if (!container || !isConfigured) return;

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("site_content")
      .select("key,value")
      .like("key", "home.capability.%");

    if (error) throw error;
    render(buildItems(data || []));
  } catch (error) {
    console.warn("Home capabilities loading skipped:", friendlyError(error, "unknown error"));
  }
}

render([]);
void loadCapabilities();
