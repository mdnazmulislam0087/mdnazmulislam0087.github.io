import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { marked } from "https://esm.sh/marked@12.0.2";
import DOMPurify from "https://esm.sh/dompurify@3.2.6";
import { SITE_CONFIG } from "./config.js";

const config = {
  supabaseUrl: String(SITE_CONFIG?.supabaseUrl || "").trim(),
  supabaseAnonKey: String(SITE_CONFIG?.supabaseAnonKey || "").trim(),
  imagesBucket: SITE_CONFIG?.imagesBucket || "blog-images",
  adminHome: SITE_CONFIG?.adminHome || "admin-dashboard.html"
};

const looksConfigured =
  config.supabaseUrl.startsWith("https://") &&
  !config.supabaseUrl.includes("YOUR-PROJECT") &&
  config.supabaseAnonKey.length > 30 &&
  !config.supabaseAnonKey.includes("YOUR_SUPABASE");

export const isConfigured = looksConfigured;

export const supabase = looksConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

export function getConfig() {
  return { ...config };
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Edit js/config.js with your project URL and anon key."
    );
  }

  return supabase;
}

export function friendlyError(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  const raw = String(error.message || error.error_description || "").trim();
  const lower = raw.toLowerCase();
  const isFetchFailure =
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed");

  if (isFetchFailure) {
    return "Could not reach Supabase. Check internet access, browser extensions/firewall, and verify js/config.js has the correct Supabase URL.";
  }

  return raw || fallback;
}

export function setAlert(element, type, message) {
  if (!element) return;
  element.className = `alert ${type}`;
  element.textContent = message;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function parseTagString(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 12);
}

export function readTimeFromMarkdown(markdownText) {
  const words = String(markdownText || "")
    .replace(/[#>*_`~\[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export function markdownToSafeHtml(markdownText) {
  const rawHtml = marked.parse(String(markdownText || ""), {
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: true
  });

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "a",
      "abbr",
      "b",
      "blockquote",
      "br",
      "code",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul",
      "span"
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style"]
  });
}

export async function uploadImageFile(file, userId, folder = "uploads") {
  if (!file) {
    throw new Error("No file selected.");
  }

  const client = requireSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const filename = `${Date.now()}-${base || "image"}.${ext}`;
  const path = `${folder}/${userId}/${filename}`;

  const { error: uploadError } = await client.storage
    .from(config.imagesBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from(config.imagesBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFileToPath(file, path, options = {}) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const targetPath = String(path || "").trim();
  if (!targetPath) {
    throw new Error("Upload path is required.");
  }

  const client = requireSupabase();
  const upsert = Boolean(options.upsert);
  const contentType = String(options.contentType || file.type || "application/octet-stream");

  const { error: uploadError } = await client.storage
    .from(config.imagesBucket)
    .upload(targetPath, file, {
      cacheControl: "3600",
      upsert,
      contentType
    });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from(config.imagesBucket).getPublicUrl(targetPath);
  return data.publicUrl;
}

export async function getCurrentSession(options = {}) {
  const { attemptRefresh = true } = options;
  const client = requireSupabase();
  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error) throw error;
  if (session || !attemptRefresh) {
    return session;
  }

  try {
    const { data, error: refreshError } = await client.auth.refreshSession();
    if (refreshError) {
      return null;
    }

    if (data?.session) {
      return data.session;
    }
  } catch {
    return null;
  }

  const {
    data: { session: retriedSession },
    error: retryError
  } = await client.auth.getSession();

  if (retryError) throw retryError;
  return retriedSession;
}

export async function requireAdminSession(redirectToLogin = true) {
  const client = requireSupabase();
  const session = await getCurrentSession({ attemptRefresh: true });

  if (!session?.user) {
    if (redirectToLogin) {
      window.location.href = "admin-login.html";
    }

    return { session: null, isAdmin: false };
  }

  const { data, error } = await client
    .from("site_admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    if (redirectToLogin) {
      await client.auth.signOut();
      window.location.href = "admin-login.html";
    }

    return { session, isAdmin: false };
  }

  return { session, isAdmin: true };
}
