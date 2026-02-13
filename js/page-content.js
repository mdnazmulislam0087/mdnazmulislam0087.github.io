import {
  friendlyError,
  isConfigured,
  markdownToSafeHtml,
  requireSupabase
} from "./supabase-client.js";

const nodes = [...document.querySelectorAll("[data-cms-key]")];

if (!nodes.length || !isConfigured) {
  // Keep static fallback content when no CMS keys are present or config is missing.
} else {
  void loadPageContent();
}

async function loadPageContent() {
  const keys = [...new Set(nodes.map((node) => node.dataset.cmsKey).filter(Boolean))];
  if (!keys.length) return;

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("site_content")
      .select("key,value,kind")
      .in("key", keys);

    if (error) throw error;

    const contentByKey = new Map((data || []).map((item) => [item.key, item]));

    nodes.forEach((node) => {
      const key = node.dataset.cmsKey;
      const content = contentByKey.get(key);
      if (!content?.value) return;

      const attr = node.dataset.cmsAttr;
      if (attr) {
        node.setAttribute(attr, content.value);
        return;
      }

      const renderType = node.dataset.cmsRender || content.kind || "text";
      if (renderType === "markdown") {
        node.innerHTML = markdownToSafeHtml(content.value);
      } else {
        node.textContent = content.value;
      }
    });
  } catch (error) {
    // Do not block page rendering if content table is unavailable.
    console.warn("Page content loading skipped:", friendlyError(error, "unknown error"));
  }
}