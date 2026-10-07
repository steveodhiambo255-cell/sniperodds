// ==========================================
// SNIPER ODDS - MAIN SCRIPT
// Used by: login, signup, forgot/reset password,
// payment, subscription, account pages.
// Load AFTER the Supabase library script.
// ==========================================


// ==========================================
// PLAN SELECTION
// ==========================================

window.selectPlan = function (plan, amount) {

    localStorage.setItem("selectedPlan", plan);
    localStorage.setItem("selectedAmount", amount);

    window.location.href = "./payment.html";
};


// ==========================================
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL =
    "https://gddyhbjslwcgtqdtbzvu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_3uoDL_R8ylwHmHiJLTGenA_geIrsFxW";

if (!window.supabase) {
    console.error(
        "Supabase library did not load. Check the <script> tag " +
        "above script.js and your internet connection."
    );
}

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


// Small helper: stops text from being treated as HTML
function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


// ==========================================
// PAYMENT PAGE - DISPLAY SELECTED PLAN
// ==========================================

const selectedPlan =
    document.getElementById("selectedPlan");

const selectedAmount =
    document.getElementById("selectedAmount");

if (selectedPlan && selectedAmount) {

    const plan =
        localStorage.getItem("selectedPlan");

    const amount =
        localStorage.getItem("selectedAmount");

    if (plan && amount) {

        selectedPlan.textContent = plan;
        selectedAmount.textContent = "KSh " + amount;

    } else {

        selectedPlan.textContent = "No plan selected";
        selectedAmount.textContent = "KSh 0";
    }
}


// ==========================================
// M-PESA PAYMENT
// ==========================================

window.startPayment = async function () {

    const phoneInput =
        document.getElementById("mpesaPhone");

    const message =
        document.getElementById("paymentMessage");

    const payButton =
        document.getElementById("payButton");

    if (!phoneInput || !message) {
        return;
    }

    const phone =
        phoneInput.value.trim();

    const amount =
        Number(localStorage.getItem("selectedAmount"));

    const plan =
        localStorage.getItem("selectedPlan");

    // Check plan
    if (!plan || !amount) {
        message.textContent =
            "Please select a subscription plan first.";
        return;
    }

    // Check phone
    if (!/^07\d{8}$/.test(phone)) {
        message.textContent =
            "Enter a valid M-Pesa number, e.g. 0712345678.";
        return;
    }

    // Convert 07XXXXXXXX to 2547XXXXXXXX
    const mpesaPhone =
        "254" + phone.substring(1);

    // Disable button (prevents double payments)
    if (payButton) {
        payButton.disabled = true;
        payButton.textContent = "Sending...";
    }

    message.textContent =
        "Sending M-Pesa payment request...";

    try {

        const { data, error } =
            await supabaseClient.functions.invoke(
                "mpesa-payment",
                {
                    body: {
                        phone: mpesaPhone,
                        amount: amount,
                        plan: plan
                    }
                }
            );

        if (error) {

            let detail = error.message;

            try {
                detail = JSON.stringify(await error.context.json());
            } catch (e) {}

            console.error("M-Pesa function error:", detail);

            message.textContent =
                "Payment failed: " + detail;

            return;
        }

        console.log("M-Pesa response:", data);

        if (
            data &&
            data.success === true &&
            data.data &&
            data.data.ResponseCode === "0"
        ) {

            message.textContent =
                "M-Pesa prompt sent. Check your phone and enter your M-Pesa PIN.";

        } else {

            message.textContent =
                "M-Pesa request was not accepted. Please try again.";
        }

    } catch (error) {

        console.error("Payment error:", error);

        message.textContent =
            "System error. Please try again.";

    } finally {

        if (payButton) {
            payButton.disabled = false;
            payButton.textContent = "Pay with M-Pesa";
        }
    }
};


// ==========================================
// SUPABASE LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("loginMessage");

        message.textContent = "Logging in...";

        try {

            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                message.textContent =
                    "Login failed: " + error.message;
                return;
            }

            message.textContent =
    "Login successful! Redirecting...";

setTimeout(function () {
    window.location.replace("account.html");
}, 300);

        } catch (error) {

            message.textContent =
                "System error: " + error.message;
        }

    });

}


// ==========================================
// ACCOUNT PAGE
// ==========================================

async function loadAccount() {

    const accountName =
        document.getElementById("accountName");

    const accountEmail =
        document.getElementById("accountEmail");

    const subscriptionPlan =
        document.getElementById("subscriptionPlan");

    const subscriptionBadge =
        document.getElementById("subscriptionBadge");

    const upgradeButton =
        document.getElementById("upgradeButton");

    // Not the account page: nothing to do
    if (!accountName || !accountEmail) {
        return;
    }

    try {

        // Read the saved login. If it is not there yet,
        // wait a moment and check once more before giving up.
        let session = null;
try {
    const result = await Promise.race([
        supabaseClient.auth.getSession(),
        new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error("timeout")); }, 4000);
        })
    ]);
    session = result.data.session;
} catch (e) {
    console.warn("Session check slow:", e.message);
}

        if (!session) {
            await new Promise(function (resolve) {
                setTimeout(resolve, 800);
            });
            ({ data: { session } } =
                await supabaseClient.auth.getSession());
        }

        const user = session ? session.user : null;

        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // Display account information
        accountEmail.textContent =
            user.email || "Not available";

        accountName.textContent =
            (user.user_metadata && user.user_metadata.name) ||
            "Member";


        // ----------------------------------
        // CHECK ACTIVE SUBSCRIPTION
        // ----------------------------------

        const {
            data: subscription,
            error: subscriptionError
        } = await supabaseClient
            .from("subscriptions")
            .select("plan, amount, status, started_at, expires_at")
            .eq("user_id", user.id)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subscriptionError) {
            console.error("Subscription error:", subscriptionError);
            return;
        }

        if (subscription) {

            // ACTIVE SUBSCRIPTION: unlock premium

            if (upgradeButton) {
                upgradeButton.style.display = "none";
            }

            const premiumTitle =
                document.getElementById("premiumTitle");

            const premiumMessage =
                document.getElementById("premiumMessage");

            const premiumButton =
                document.getElementById("premiumButton");

            const premiumContent =
                document.getElementById("premiumContent");

            if (premiumTitle) {
                premiumTitle.textContent =
                    "Premium Picks Unlocked";
            }

            if (premiumMessage) {
                premiumMessage.textContent =
                    "Your subscription is active. Premium football selections are now unlocked.";
            }

            if (premiumButton) {
                premiumButton.style.display = "none";
            }

            if (premiumContent) {
                premiumContent.classList.remove("premium-locked");
            }

            if (subscriptionPlan) {
                subscriptionPlan.textContent = subscription.plan;
            }

            if (subscriptionBadge) {
                subscriptionBadge.textContent = "ACTIVE";
            }

            const subscriptionText =
                document.querySelector(".subscription-text");

            if (subscriptionText) {
                subscriptionText.textContent =
                    "Your premium subscription is active.";
            }

            console.log("Active subscription:", subscription);

        } else {

            // No active subscription

            if (subscriptionPlan) {
                subscriptionPlan.textContent = "Free";
            }

            if (subscriptionBadge) {
                subscriptionBadge.textContent = "FREE";
            }
        }

    } catch (error) {

        console.error("Account loading error:", error);

        accountName.textContent = "Unable to load";
        accountEmail.textContent = "Unable to load";
    }
}

// Load account information
loadAccount();


// ==========================================
// LOAD PREMIUM PREDICTIONS
// ==========================================

async function loadPremiumPredictions() {

    const premiumContent =
        document.getElementById("premiumContent");

    if (!premiumContent) return;

    try {

        const {
            data: predictions,
            error
        } = await supabaseClient
            .from("premium_predictions")
            .select(
                "id, match_date, home_team, away_team, market, player, prediction, odds, analysis"
            )
            .order("match_date", { ascending: true });

        if (error) {
            console.error("Premium predictions error:", error);
            return;
        }

        if (!predictions || predictions.length === 0) {

            premiumContent.innerHTML = `
                <div class="big-lock">🎯</div>
                <h3>Premium Predictions</h3>
                <p>No premium selections have been published yet.</p>
            `;

            return;
        }

        premiumContent.innerHTML = "";

        predictions.forEach(function (prediction) {

            const card = document.createElement("div");
            card.className = "prediction-card";

            const marketHtml = prediction.market
                ? `<div class="prediction-market">${escapeHtml(prediction.market)}</div>`
                : "";

            const titleHtml = prediction.player
                ? `<h3>👤 ${escapeHtml(prediction.player)}</h3>`
                : `<h3>⚽ ${escapeHtml(prediction.home_team)} vs ${escapeHtml(prediction.away_team)}</h3>`;

            const oddsHtml = prediction.odds
                ? `<p><strong>💰 Odds:</strong> ${escapeHtml(prediction.odds)}</p>`
                : "";

            const analysisHtml = prediction.analysis
                ? `<p class="prediction-analysis">📊 ${escapeHtml(prediction.analysis)}</p>`
                : "";

            card.innerHTML = `
                <div class="prediction-date">${escapeHtml(prediction.match_date)}</div>
                ${marketHtml}
                ${titleHtml}
                <p><strong>🎯 Prediction:</strong> ${escapeHtml(prediction.prediction)}</p>
                ${oddsHtml}
                ${analysisHtml}
            `;

            premiumContent.appendChild(card);
        });

    } catch (error) {

        console.error("Premium prediction loading error:", error);
    }
}

loadPremiumPredictions();
