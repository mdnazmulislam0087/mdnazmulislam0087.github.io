import { friendlyError, isConfigured, requireSupabase } from "./supabase-client.js";

const container = document.getElementById("home-focus-grid");

const fallbackCards = [
  {
    status: "Active Program",
    title: "Assistive Rehabilitation Robotics",
    desc: "Developing adaptive devices that support motion therapy and enable measurable rehabilitation progress."
  },
  {
    status: "Active Program",
    title: "Wearable Breathing Support",
    desc: "Designing wearable mechanisms to assist diaphragmatic breathing with sensor-driven feedback loops."
  },
  {
    status: "Active Program",
    title: "AI-Enabled Clinical Decision Support",
    desc: "Building reliable AI pipelines for healthcare interpretation, monitoring, and intervention support."
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

function renderCards(cards) {
  if (!container) return;
  const list = cards.length ? cards : fallbackCards;
  container.innerHTML = list
    .map(
      (card) => `
        <article class="home-focus-card">
          <p class="home-focus-status">Active Program</p>
          <h3>${escapeHtml(card.title || "Untitled Focus")}</h3>
          <p>${escapeHtml(card.desc || "")}</p>
        </article>
      `
    )
    .join("");
}

function buildFocusCards(rows) {
  const cardMap = new Map();
  const pattern = /^home\.focus\.(\d+)\.(status|title|desc)$/;

  rows.forEach((row) => {
    const key = String(row?.key || "");
    const match = key.match(pattern);
    if (!match) return;

    const index = Number(match[1]);
    const field = match[2];
    if (!cardMap.has(index)) {
      cardMap.set(index, { status: "Active Program", title: "", desc: "" });
    }

    const entry = cardMap.get(index);
    entry[field] = String(row?.value || "").trim();
  });

  return [...cardMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => ({
      status: "Active Program",
      title: value.title,
      desc: value.desc
    }))
    .filter((item) => item.title || item.desc);
}

async function loadFocusCards() {
  if (!container || !isConfigured) return;

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("site_content")
      .select("key,value")
      .like("key", "home.focus.%");

    if (error) throw error;

    const cards = buildFocusCards(data || []);
    renderCards(cards);
  } catch (error) {
    console.warn("Focus cards loading skipped:", friendlyError(error, "unknown error"));
  }
}

renderCards([]);
void loadFocusCards();
