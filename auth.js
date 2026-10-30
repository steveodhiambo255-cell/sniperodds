
// ======================================================
// SNIPER ODDS - CENTRAL AUTHENTICATION & ACCESS CONTROL
// config.js MUST load before auth.js
// ======================================================

"use strict";

// ---------- Referral link capture ----------
(function captureRef() {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) localStorage.setItem("so_ref", ref.trim());
})();

// ---------- Session helpers ----------

async function getUser() {
    const { data, error } = await sb.auth.getUser();

    if (error) {
        console.error("User verification:", error);
        return null;
    }

    return data.user || null;
}

// ---------- Administrator verification ----------

async function isAdmin() {
    const user = await getUser();

    if (!user) return false;

    const { data, error } = await sb.rpc("is_admin");

    if (error) {
        console.error("Admin verification failed:", error);
        return false;
    }

    return data === true;
}

// ---------- Access control ----------

async function requireLogin(redirect = "login.html") {
    const user = await getUser();

    if (!user) {
        location.href = redirect;
        return null;
    }

    return user;
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

// Admin automatically qualifies for premium access.
// Ordinary users must have an active, unexpired subscription.

async function hasActiveSubscription() {
    const user = await getUser();

    if (!user) return false;

    if (await isAdmin()) return true;

    const { data, error } = await sb
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1);

    if (error) {
        console.error("Subscription verification:", error);
        return false;
    }

    return !!(data && data.length);
}

// Use this on premium pages.
// Returns the user if admin or active subscriber.
// Otherwise redirects to subscription page.

async function requirePremium(redirect = "subscription.html") {
    const user = await requireLogin();

    if (!user) return null;

    if (await isAdmin()) return user;

    if (await hasActiveSubscription()) return user;

    location.href = redirect;
    return null;
}

// ---------- Sign up / log in / log out ----------

async function signUp(fullName, email, password) {
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                name: fullName
            }
        }
    });

    if (error) return { error: error.message };

    return {
        user: data.user,
        needsConfirm: !data.session
    };
}

async function logIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

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
    const redirectTo = new URL(
        "reset-password.html",
        location.href
    ).href;

    const { error } = await sb.auth.resetPasswordForEmail(
        email,
        { redirectTo }
    );

    return error
        ? { error: error.message }
        : { ok: true };
}

async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({
        password: newPassword
    });

    return error
        ? { error: error.message }
        : { ok: true };
}

// ---------- Referrals ----------

function makeCode() {
    return "SO" +
        Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureReferralCode(user) {
    const { data, error } = await sb
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Referral code lookup:", error);
        return null;
    }

    if (data) return data.code;

    const code = makeCode();

    const { error: insertError } = await sb
        .from("referral_codes")
        .insert({
            user_id: user.id,
            code
        });

    return insertError ? null : code;
}

async function recordReferral(user) {
    const ref = localStorage.getItem("so_ref");

    if (!ref) return;

    const { data: referrerId, error } = await sb.rpc(
        "get_referrer",
        { p_code: ref }
    );

    if (error) {
        console.error("Referral lookup:", error);
        return;
    }

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
                status: "pending"
            });
        }
    }

    localStorage.removeItem("so_ref");
}

async function afterLogin(user) {
    try {
        await ensureReferralCode(user);
        await recordReferral(user);
    } catch (error) {
        console.error("Post-login processing:", error);
    }
}

// ---------- Navigation ----------

async function updateNav() {
    const user = await getUser();

    const admin = user ? await isAdmin() : false;

    document.querySelectorAll(".auth-only").forEach(el => {
        el.style.display = user ? "" : "none";
    });

    document.querySelectorAll(".guest-only").forEach(el => {
        el.style.display = user ? "none" : "";
    });

    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = admin ? "" : "none";
    });

    document.querySelectorAll(".member-only").forEach(el => {
        el.style.display = user && !admin ? "" : "none";
    });

    document.querySelectorAll(".premium-only").forEach(el => {
        el.style.display = user ? "" : "none";
    });

    return {
        user,
        isAdmin: admin
    };
}

document.addEventListener("DOMContentLoaded", updateNav);
