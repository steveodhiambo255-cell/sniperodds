// auth.js - needs config.js loaded first

// ---------- Referral link capture (?ref=CODE) ----------
(function captureRef() {
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref) localStorage.setItem("so_ref", ref.trim());
})();

// ---------- Session helpers ----------
async function getUser() {
  const { data } = await sb.auth.getUser();
  return data.user || null;
}

async function requireLogin(redirect = "login.html") {
  const user = await getUser();
  if (!user) {
    location.href = redirect;
    return null;
  }
  return user;
}

async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  const { data } = await sb
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}

async function requireAdmin(redirect = "index.html") {
  const user = await requireLogin();
  if (!user) return null;
  if (!(await isAdmin())) {
    location.href = redirect;
    return null;
  }
  return user;
}

async function hasActiveSubscription() {
  const user = await getUser();
  if (!user) return false;
  const { data } = await sb
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  return !!(data && data.length);
}

// ---------- Sign up / log in / log out ----------
async function signUp(fullName, email, password) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };
  // If email confirmation is ON there is no session yet
  const needsConfirm = !data.session;
  return { user: data.user, needsConfirm };
}

async function logIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await afterLogin(data.user);
  return { user: data.user };
}

async function logOut() {
  await sb.auth.signOut();
  location.href = "login.html";
}

// ---------- Password reset ----------
async function sendResetEmail(email) {
  const redirectTo = new URL("reset_password.html", location.href).href;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  return error ? { error: error.message } : { ok: true };
}

// Call on reset_password.html (user arrives via the emailed link)
async function updatePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return error ? { error: error.message } : { ok: true };
}

// ---------- Referrals ----------
function makeCode() {
  return "SO" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureReferralCode(user) {
  const { data } = await sb
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) return data.code;
  const code = makeCode();
  const { error } = await sb
    .from("referral_codes")
    .insert({ user_id: user.id, code });
  return error ? null : code;
}

async function recordReferral(user) {
  const ref = localStorage.getItem("so_ref");
  if (!ref) return;
  const { data: referrerId } = await sb.rpc("get_referrer", { p_code: ref });
  if (referrerId && referrerId !== user.id) {
    const { data: existing } = await sb
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .maybeSingle();
    if (!existing) {
      await sb.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: user.id,
        status: "pending",
      });
    }
  }
  localStorage.removeItem("so_ref");
}

async function afterLogin(user) {
  try {
    await ensureReferralCode(user);
    await recordReferral(user);
  } catch (e) {
    console.error(e);
  }
}

// ---------- Show/hide nav items ----------
// Add class="auth-only" to logged-in links and class="guest-only" to login/signup links
async function updateNav() {
  const user = await getUser();
  document.querySelectorAll(".auth-only").forEach(
    (el) => (el.style.display = user ? "" : "none")
  );
  document.querySelectorAll(".guest-only").forEach(
    (el) => (el.style.display = user ? "none" : "")
  );
}
document.addEventListener("DOMContentLoaded", updateNav);
