import { friendlyError, isConfigured, requireSupabase } from "./supabase-client.js";

const container = document.getElementById("research-pubs-grid");

const fallbackItems = [
  {
    meta: "2025 | Conference",
    title:
      "Universal Joint Orthosis (UJO): Assistive and Resistive Movement Device for Astronauts and Medical Rehabilitation",
    url: "https://doi.org/10.1115/DMD2025-1028"
  },
  {
    meta: "2025 | Conference",
    title: "Development of a Wearable Device for Assisting Diaphragmatic Breathing",
    url: "https://doi.org/10.1115/DMD2025-1081"
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

function renderItems(items) {
  if (!container) return;
  const list = items.length ? items : fallbackItems;
  container.innerHTML = list
    .map((item, index) => {
      const safeUrl = String(item.url || "").trim();
      const serial = String(index + 1).padStart(2, "0");
      return `
        <article class="card pub research-pub-card">
          <div class="research-pub-head">
            <span class="research-pub-serial">${serial}</span>
            <p class="meta research-pub-meta">${escapeHtml(item.meta || "")}</p>
          </div>
          <h3 class="research-pub-title">${escapeHtml(item.title || "")}</h3>
          <div class="research-pub-actions">
            <a class="card-link research-pub-link" href="${escapeHtml(safeUrl || "#")}" target="_blank" rel="noreferrer">View publication</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function extractYear(meta) {
  const match = String(meta || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : 0;
}

function buildItems(rows) {
  const map = new Map();
  const pattern = /^research\.pub\.(\d+)\.(meta|title|url)$/;

  rows.forEach((row) => {
    const key = String(row?.key || "");
    const match = key.match(pattern);
    if (!match) return;

    const index = Number(match[1]);
    const field = match[2];
    if (!map.has(index)) {
      map.set(index, { meta: "", title: "", url: "" });
    }

    map.get(index)[field] = String(row?.value || "").trim();
  });

  return [...map.entries()]
    .map(([index, value]) => ({
      index,
      meta: value.meta,
      title: value.title,
      url: value.url,
      year: extractYear(value.meta)
    }))
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.index - b.index;
    })
    .map(({ meta, title, url }) => ({ meta, title, url }))
    .filter((item) => item.title || item.meta || item.url);
}

async function loadPubs() {
  if (!container || !isConfigured) return;

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("site_content")
      .select("key,value")
      .like("key", "research.pub.%");

    if (error) throw error;

    const pubs = buildItems(data || []);
    renderItems(pubs);
  } catch (error) {
    console.warn("Research pubs loading skipped:", friendlyError(error, "unknown error"));
  }
}

renderItems([]);
void loadPubs();
