const sourceEl = document.getElementById("research-topics-source");
const gridEl = document.getElementById("research-topics-grid");

const fallbackTopics = [
  "Assistive Robotics",
  "Rehabilitation Devices",
  "Breathing Mechanics",
  "Embedded Intelligence",
  "Wearable Biomedical Systems"
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseTopics(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];

  let parts = raw
    .split(/\r?\n|,|;|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length <= 1 && raw.toLowerCase().includes(" and ")) {
    parts = raw
      .split(/\band\b/gi)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [...new Set(parts)];
}

function renderTopics(topics) {
  if (!gridEl) return;
  const list = topics.length ? topics : fallbackTopics;
  gridEl.innerHTML = list.map((topic) => `<span>${escapeHtml(topic)}</span>`).join("");
}

function syncTopics() {
  const topics = parseTopics(sourceEl?.textContent || sourceEl?.innerText || "");
  renderTopics(topics);
}

if (sourceEl && gridEl) {
  const observer = new MutationObserver(() => {
    syncTopics();
  });
  observer.observe(sourceEl, { childList: true, subtree: true, characterData: true });

  syncTopics();
}
