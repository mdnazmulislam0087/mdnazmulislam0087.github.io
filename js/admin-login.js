import {
  friendlyError,
  getConfig,
  isConfigured,
  requireAdminSession,
  requireSupabase,
  setAlert
} from "./supabase-client.js?v=20260213-1";

const form = document.getElementById("admin-login-form");
const alertEl = document.getElementById("login-alert");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const { adminHome } = getConfig();

function disableForm(disabled) {
  if (!form) return;
  [...form.querySelectorAll("input, button")].forEach((el) => {
    el.disabled = disabled;
  });
}

async function redirectIfAlreadySignedIn() {
  if (!isConfigured) return;

  try {
    const { session, isAdmin } = await requireAdminSession(false);
    if (session?.user && isAdmin) {
      window.location.href = adminHome;
    }
  } catch {
    // no-op for login page pre-check
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (!isConfigured) {
    setAlert(alertEl, "error", "Supabase config missing. Update js/config.js first.");
    return;
  }

  const email = String(emailInput?.value || "").trim();
  const password = String(passwordInput?.value || "");

  if (!email || !password) {
    setAlert(alertEl, "error", "Email and password are required.");
    return;
  }

  disableForm(true);
  setAlert(alertEl, "info", "Signing in...");

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) {
      throw new Error("No user session returned.");
    }

    const { data: adminRow, error: adminError } = await supabase
      .from("site_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminError) throw adminError;

    if (!adminRow) {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized as a site admin.");
    }

    setAlert(alertEl, "success", "Login successful. Redirecting...");
    window.location.href = adminHome;
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Login failed."));
    disableForm(false);
  }
}

const isFileProtocol = window.location.protocol === "file:";

if (isFileProtocol) {
  setAlert(
    alertEl,
    "error",
    "Login is unavailable from file:// URLs. Run a local server (for example: python -m http.server 8080) and open http://localhost:8080/admin-login.html."
  );
  disableForm(true);
} else if (!isConfigured) {
  setAlert(alertEl, "error", "Supabase config missing. Edit js/config.js with your project values.");
  disableForm(true);
} else {
  form?.addEventListener("submit", handleLogin);
  void redirectIfAlreadySignedIn();
}
