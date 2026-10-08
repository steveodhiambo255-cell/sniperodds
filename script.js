/* =========================================================
   SNIPER ODDS
   Main JavaScript
   ========================================================= */

/* =========================================================
   1. PLAN SELECTION
   ========================================================= */

window.selectPlan = function (plan, amount) {
    localStorage.setItem("selectedPlan", plan);
    localStorage.setItem("selectedAmount", amount);

    window.location.href = "./payment.html";
};


/* =========================================================
   2. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://gddyhbjslwcgtqdtbzvu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_3uoDL_R8ylwHmHiJLTGenA_geIrsFxW";

if (!window.supabase) {

    console.error(
        "Supabase library did not load. Check the Supabase script tag."
    );

} else {

    window.supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
}

const supabaseClient = window.supabaseClient;


/* =========================================================
   3. SMALL HELPER FUNCTIONS
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function showMessage(element, message, type = "") {

    if (!element) return;

    element.textContent = message;

    element.classList.remove(
        "success",
        "error",
        "info"
    );

    if (type) {
        element.classList.add(type);
    }
}


function redirectToLogin() {
    window.location.href = "./login.html";
}


/* =========================================================
   4. GET CURRENT LOGGED-IN USER
   ========================================================= */

async function getCurrentUser() {

    if (!supabaseClient) {
        return null;
    }

    try {

        const result =
            await supabaseClient.auth.getUser();

        if (result.error) {
            console.error(
                "Unable to get current user:",
                result.error
            );

            return null;
        }

        return result.data?.user || null;

    } catch (error) {

        console.error(
            "Current user check failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   5. GET ACTIVE SUBSCRIPTION
   ========================================================= */

async function getActiveSubscription(userId) {

    if (!supabaseClient || !userId) {
        return null;
    }

    try {

        const now =
            new Date().toISOString();

        const {
            data,
            error
        } = await supabaseClient
            .from("subscriptions")
            .select(
                "plan, amount, status, started_at, expires_at"
            )
            .eq("user_id", userId)
            .eq("status", "active")
            .gt("expires_at", now)
            .order(
                "expires_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();

        if (error) {

            console.error(
                "Subscription lookup failed:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Subscription check failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   6. LOGIN
   ========================================================= */

const loginForm =
    getElement("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const emailInput =
                getElement("loginEmail");

            const passwordInput =
                getElement("loginPassword");

            const message =
                getElement("loginMessage");

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {

                showMessage(
                    message,
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }

            if (!supabaseClient) {

                showMessage(
                    message,
                    "Supabase is not available. Please refresh the page.",
                    "error"
                );

                return;
            }

            showMessage(
                message,
                "Signing in...",
                "info"
            );

            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                if (error) {

                    console.error(
                        "Login error:",
                        error
                    );

                    showMessage(
                        message,
                        error.message ||
                        "Login failed. Please check your details.",
                        "error"
                    );

                    return;
                }

                if (!data?.user) {

                    showMessage(
                        message,
                        "Login failed. Please try again.",
                        "error"
                    );

                    return;
                }

                showMessage(
                    message,
                    "Login successful. Redirecting...",
                    "success"
                );

                window.location.href =
                    "./account.html";

            } catch (error) {

                console.error(
                    "Unexpected login error:",
                    error
                );

                showMessage(
                    message,
                    "Something went wrong during login.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   7. SIGN UP
   ========================================================= */

const signupForm =
    getElement("signupForm");

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const nameInput =
                getElement("signupName");

            const emailInput =
                getElement("signupEmail");

            const passwordInput =
                getElement("signupPassword");

            const message =
                getElement("signupMessage");

            const name =
                nameInput?.value.trim() || "";

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!name || !email || !password) {

                showMessage(
                    message,
                    "Please complete all fields.",
                    "error"
                );

                return;
            }

            if (password.length < 6) {

                showMessage(
                    message,
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }

            if (!supabaseClient) {

                showMessage(
                    message,
                    "Supabase is not available. Please refresh the page.",
                    "error"
                );

                return;
            }

            showMessage(
                message,
                "Creating your account...",
                "info"
            );

            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth.signUp({

                        email: email,

                        password: password,

                        options: {

                            data: {
                                name: name
                            },

                            emailRedirectTo:
                                "https://steveodhiambo255-cell.github.io/sniperodds/"
                        }
                    });

                if (error) {

                    console.error(
                        "Signup error:",
                        error
                    );

                    showMessage(
                        message,
                        error.message ||
                        "Account creation failed.",
                        "error"
                    );

                    return;
                }

                /*
                 * Supabase may require email verification.
                 */

                if (data?.user) {

                    showMessage(
                        message,
                        "Account created successfully. Please check your email to verify your account.",
                        "success"
                    );

                } else {

                    showMessage(
                        message,
                        "Please check your email to complete registration.",
                        "success"
                    );
                }

            } catch (error) {

                console.error(
                    "Unexpected signup error:",
                    error
                );

                showMessage(
                    message,
                    "Something went wrong while creating your account.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   8. FORGOT PASSWORD
   ========================================================= */

const forgotPasswordForm =
    getElement("forgotPasswordForm");

if (forgotPasswordForm) {

    forgotPasswordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const emailInput =
                getElement("forgotEmail");

            const message =
                getElement("forgotMessage");

            const email =
                emailInput?.value.trim() || "";

            if (!email) {

                showMessage(
                    message,
                    "Please enter your email address.",
                    "error"
                );

                return;
            }

            if (!supabaseClient) {

                showMessage(
                    message,
                    "Supabase is not available.",
                    "error"
                );

                return;
            }

            showMessage(
                message,
                "Sending password reset email...",
                "info"
            );

            try {

                const {
                    error
                } =
                    await supabaseClient.auth.resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                "https://steveodhiambo255-cell.github.io/sniperodds/reset-password.html"
                        }
                    );

                if (error) {

                    console.error(
                        "Password reset error:",
                        error
                    );

                    showMessage(
                        message,
                        error.message ||
                        "Unable to send password reset email.",
                        "error"
                    );

                    return;
                }

                showMessage(
                    message,
                    "Password reset instructions have been sent to your email.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "Unexpected password reset error:",
                    error
                );

                showMessage(
                    message,
                    "Something went wrong. Please try again.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   9. RESET PASSWORD
   ========================================================= */

const resetPasswordForm =
    getElement("resetPasswordForm");

if (resetPasswordForm) {

    resetPasswordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const passwordInput =
                getElement("newPassword");

            const confirmInput =
                getElement("confirmPassword");

            const message =
                getElement("resetMessage");

            const password =
                passwordInput?.value || "";

            const confirmPassword =
                confirmInput?.value || "";

            if (!password || !confirmPassword) {

                showMessage(
                    message,
                    "Please enter and confirm your new password.",
                    "error"
                );

                return;
            }

            if (password.length < 6) {

                showMessage(
                    message,
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }

            if (password !== confirmPassword) {

                showMessage(
                    message,
                    "Passwords do not match.",
                    "error"
                );

                return;
            }

            if (!supabaseClient) {

                showMessage(
                    message,
                    "Supabase is not available.",
                    "error"
                );

                return;
            }

            showMessage(
                message,
                "Updating your password...",
                "info"
            );

            try {

                const {
                    error
                } =
                    await supabaseClient.auth.updateUser({
                        password: password
                    });

                if (error) {

                    console.error(
                        "Password update error:",
                        error
                    );

                    showMessage(
                        message,
                        error.message ||
                        "Unable to update password.",
                        "error"
                    );

                    return;
                }

                showMessage(
                    message,
                    "Password updated successfully. You can now log in.",
                    "success"
                );

                setTimeout(
                    function () {
                        window.location.href =
                            "./login.html";
                    },
                    1500
                );

            } catch (error) {

                console.error(
                    "Unexpected password update error:",
                    error
                );

                showMessage(
                    message,
                    "Something went wrong while updating your password.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   10. LOGOUT
   ========================================================= */

window.logout =
    async function () {

        if (!supabaseClient) {
            redirectToLogin();
            return;
        }

        try {

            const {
                error
            } =
                await supabaseClient.auth.signOut();

            if (error) {
                console.error(
                    "Logout error:",
                    error
                );
            }

        } catch (error) {

            console.error(
                "Unexpected logout error:",
                error
            );

        } finally {

            window.location.href =
                "./login.html";
        }
    };


/* =========================================================
   11. ACCOUNT PAGE
   ========================================================= */

async function loadAccount() {

    const accountName =
        getElement("accountName");

    const accountEmail =
        getElement("accountEmail");

    const subscriptionPlan =
        getElement("subscriptionPlan");

    const subscriptionBadge =
        getElement("subscriptionBadge");

    const subscriptionText =
        getElement("subscriptionText");

    const upgradeButton =
        getElement("upgradeButton");

    const upgradeTitle =
        getElement("upgradeTitle");

    const upgradeDescription =
        getElement("upgradeDescription");

    const premiumContent =
        getElement("premiumContent");

    const premiumTitle =
        getElement("premiumTitle");

    const premiumMessage =
        getElement("premiumMessage");

    const premiumButton =
        getElement("premiumButton");


    /*
     * Only run on pages containing account elements.
     */

    if (
        !accountName &&
        !accountEmail &&
        !subscriptionPlan
    ) {
        return;
    }


    /*
     * Make sure Supabase exists.
     */

    if (!supabaseClient) {

        console.error(
            "Supabase client is not available."
        );

        return;
    }


    /*
     * Get current session/user.
     */

    let user = null;

    try {

        const sessionPromise =
            supabaseClient.auth.getSession();

        const timeoutPromise =
            new Promise(
                function (resolve) {
                    setTimeout(
                        function () {
                            resolve(null);
                        },
                        8000
                    );
                }
            );

        const result =
            await Promise.race([
                sessionPromise,
                timeoutPromise
            ]);

        if (result?.data?.session?.user) {

            user =
                result.data.session.user;

        } else {

            user =
                await getCurrentUser();
        }

    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );

        redirectToLogin();
        return;
    }


    /*
     * No authenticated user.
     */

    if (!user) {

        redirectToLogin();
        return;
    }


    /* =====================================================
       ACCOUNT INFORMATION
       ===================================================== */

    const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        "SNIPER ODDS User";

    if (accountName) {
        accountName.textContent = name;
    }

    if (accountEmail) {
        accountEmail.textContent =
            user.email || "";
    }


    /* =====================================================
       DEFAULT FREE STATE
       ===================================================== */

    if (subscriptionPlan) {
        subscriptionPlan.textContent =
            "Free";
    }

    if (subscriptionBadge) {

        subscriptionBadge.textContent =
            "FREE";

        subscriptionBadge.classList.remove(
            "active",
            "premium"
        );
    }

    if (subscriptionText) {

        subscriptionText.textContent =
            "You currently have access to free analysis and predictions. Upgrade to unlock premium content.";
    }


    /*
     * Default upgrade section.
     */

    if (upgradeTitle) {

        upgradeTitle.textContent =
            "Upgrade to Premium";
    }

    if (upgradeDescription) {

        upgradeDescription.textContent =
            "Unlock premium football analysis and exclusive predictions.";
    }

    if (upgradeButton) {

        upgradeButton.style.display =
            "inline-block";

        upgradeButton.textContent =
            "Choose Premium Plan";

        upgradeButton.href =
            "./subscription.html";
    }


    /*
     * Default premium locked state.
     */

    if (premiumTitle) {

        premiumTitle.textContent =
            "Premium Analysis Locked";
    }

    if (premiumMessage) {

        premiumMessage.textContent =
            "Premium football predictions are available to active premium subscribers.";
    }

    if (premiumButton) {

        premiumButton.style.display =
            "inline-block";

        premiumButton.textContent =
            "View Premium Plans";

        premiumButton.href =
            "./subscription.html";
    }


    /*
     * Check active subscription.
     */

    const subscription =
        await getActiveSubscription(user.id);


    /* =====================================================
       FREE USER
       ===================================================== */

    if (!subscription) {

        /*
         * Keep premium content locked.
         */

        if (premiumContent) {

            premiumContent.innerHTML = `
                <div class="premium-locked">
                    <div class="lock-icon">🔒</div>

                    <h3>Premium Picks Locked</h3>

                    <p>
                        Subscribe to a Premium plan to unlock
                        exclusive football predictions and deeper analysis.
                    </p>
                </div>
            `;
        }

        return;
    }


    /* =====================================================
       ACTIVE PREMIUM USER
       ===================================================== */

    const plan =
        subscription.plan ||
        "Premium Pass";


    /*
     * Current plan.
     */

    if (subscriptionPlan) {

        subscriptionPlan.textContent =
            plan;
    }


    /*
     * Active badge.
     */

    if (subscriptionBadge) {

        subscriptionBadge.textContent =
            "ACTIVE";

        subscriptionBadge.classList.add(
            "active"
        );

        subscriptionBadge.classList.remove(
            "premium"
        );
    }


    /*
     * Correct subscription description.
     */

    if (subscriptionText) {

        subscriptionText.textContent =
            `Your ${plan} is active. You have access to free and premium analysis.`;
    }


    /*
     * IMPORTANT:
     * Do NOT hide the upgrade button.
     *
     * An active Daily Pass user must still be able
     * to select Weekly or Monthly.
     */

    if (upgradeTitle) {

        if (
            plan.toLowerCase().includes("monthly")
        ) {

            upgradeTitle.textContent =
                "Renew / Manage Plan";

        } else {

            upgradeTitle.textContent =
                "Extend / Upgrade Plan";
        }
    }


    if (upgradeDescription) {

        if (
            plan.toLowerCase().includes("daily")
        ) {

            upgradeDescription.textContent =
                "Your Daily Pass is active. You can extend your access or upgrade to a longer premium plan.";

        } else if (
            plan.toLowerCase().includes("weekly")
        ) {

            upgradeDescription.textContent =
                "Your Weekly Pass is active. Extend your access or upgrade to the Monthly Pass.";

        } else if (
            plan.toLowerCase().includes("monthly")
        ) {

            upgradeDescription.textContent =
                "Your Monthly Pass is active. Renew your premium access whenever you are ready.";

        } else {

            upgradeDescription.textContent =
                "Your premium access is active. You can extend or manage your plan.";
        }
    }


    if (upgradeButton) {

        upgradeButton.style.display =
            "inline-block";

        upgradeButton.textContent =
            "Manage Premium Plan";

        upgradeButton.href =
            "./subscription.html";
    }


    /*
     * Unlock premium section.
     */

    if (premiumTitle) {

        premiumTitle.textContent =
            "Premium Picks Unlocked";
    }

    if (premiumMessage) {

        premiumMessage.textContent =
            `Your ${plan} is active. Premium football selections are now unlocked.`;
    }


    /*
     * Premium users do not need the premium
     * subscription button.
     */

    if (premiumButton) {

        premiumButton.style.display =
            "none";
    }


    /*
     * Load premium predictions only for
     * authenticated active subscribers.
     */

    await loadPremiumPredictions();
}


/* =========================================================
   12. PREMIUM PREDICTIONS
   ========================================================= */

async function loadPremiumPredictions() {

    const premiumContent =
        getElement("premiumContent");

    if (!premiumContent) {
        return;
    }

    if (!supabaseClient) {
        return;
    }


    /*
     * Verify user.
     */

    const user =
        await getCurrentUser();

    if (!user) {

        premiumContent.innerHTML = `
            <div class="premium-locked">
                <div class="lock-icon">🔒</div>

                <h3>Premium Picks Locked</h3>

                <p>
                    Please log in and activate a Premium plan
                    to access premium predictions.
                </p>
            </div>
        `;

        return;
    }


    /*
     * Verify active subscription AGAIN.
     *
     * This prevents this function from simply
     * loading premium data for every logged-in user.
     */

    const subscription =
        await getActiveSubscription(user.id);

    if (!subscription) {

        premiumContent.innerHTML = `
            <div class="premium-locked">
                <div class="lock-icon">🔒</div>

                <h3>Premium Picks Locked</h3>

                <p>
                    Subscribe to a Premium plan to unlock
                    exclusive football predictions.
                </p>

                <a
                    href="./subscription.html"
                    class="primary-btn"
                >
                    View Premium Plans
                </a>
            </div>
        `;

        return;
    }


    /*
     * Active subscriber:
     * retrieve premium predictions.
     */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("premium_predictions")
                .select(
                    "id, match_date, home_team, away_team, market, player, prediction, odds, analysis"
                )
                .order(
                    "match_date",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "Premium predictions error:",
                error
            );

            premiumContent.innerHTML = `
                <div class="premium-locked">
                    <h3>Premium Analysis</h3>

                    <p>
                        We could not load the premium predictions right now.
                        Please refresh and try again.
                    </p>
                </div>
            `;

            return;
        }


        /*
         * No predictions available.
         */

        if (!data || data.length === 0) {

            premiumContent.innerHTML = `
                <div class="premium-locked">
                    <h3>Premium Analysis</h3>

                    <p>
                        No premium predictions are available yet.
                        Please check again later.
                    </p>
                </div>
            `;

            return;
        }


        /*
         * Render predictions.
         */

        premiumContent.innerHTML =
            data.map(
                function (prediction) {

                    const date =
                        prediction.match_date
                            ? new Date(
                                prediction.match_date
                            ).toLocaleDateString(
                                "en-GB",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                }
                            )
                            : "";


                    const match =
                        `${prediction.home_team || ""} vs ${prediction.away_team || ""}`;


                    return `
                        <article class="prediction-card">

                            <div class="prediction-date">
                                ${date}
                            </div>

                            <h3 class="prediction-match">
                                ⚽ ${match}
                            </h3>

                            ${
                                prediction.market
                                    ? `
                                        <div class="prediction-market">
                                            📊 Market:
                                            ${prediction.market}
                                        </div>
                                      `
                                    : ""
                            }

                            ${
                                prediction.player
                                    ? `
                                        <div class="prediction-player">
                                            👤 Player:
                                            ${prediction.player}
                                        </div>
                                      `
                                    : ""
                            }

                            <div class="prediction-pick">
                                🎯 Prediction:
                                <strong>
                                    ${prediction.prediction || ""}
                                </strong>
                            </div>

                            ${
                                prediction.odds
                                    ? `
                                        <div class="prediction-odds">
                                            💰 Odds:
                                            <strong>
                                                ${prediction.odds}
                                            </strong>
                                        </div>
                                      `
                                    : ""
                            }

                            ${
                                prediction.analysis
                                    ? `
                                        <div class="prediction-analysis">
                                            ${prediction.analysis}
                                        </div>
                                      `
                                    : ""
                            }

                        </article>
                    `;
                }
            ).join("");

    } catch (error) {

        console.error(
            "Unexpected premium prediction error:",
            error
        );

        premiumContent.innerHTML = `
            <div class="premium-locked">
                <h3>Premium Analysis</h3>

                <p>
                    Something went wrong while loading the predictions.
                    Please refresh the page.
                </p>
            </div>
        `;
    }
}


/* =========================================================
   13. M-PESA PAYMENT
   ========================================================= */

let paymentInProgress = false;


async function startPayment() {

    /*
     * Prevent double-click / duplicate requests.
     */

    if (paymentInProgress) {
        return;
    }


    const phoneInput =
        getElement("mpesaPhone");

    const message =
        getElement("paymentMessage");

    const payButton =
        getElement("payButton");


    /*
     * Selected plan is stored by selectPlan().
     */

    const plan =
        localStorage.getItem("selectedPlan");

    const selectedAmount =
        localStorage.getItem("selectedAmount");


    /*
     * Make sure a plan exists.
     */

    if (!plan) {

        showMessage(
            message,
            "Please select a subscription plan first.",
            "error"
        );

        return;
    }


    /*
     * Read phone.
     */

    let phone =
        phoneInput?.value.trim() || "";


    /*
     * Accept:
     * 07xxxxxxxx
     * 01xxxxxxxx
     * 2547xxxxxxxx
     * 2541xxxxxxxx
     */

    phone =
        phone.replace(
            /\s+/g,
            ""
        );


    if (
        /^07\d{8}$/.test(phone) ||
        /^01\d{8}$/.test(phone)
    ) {

        phone =
            "254" +
            phone.substring(1);

    } else if (
        /^254[17]\d{8}$/.test(phone)
    ) {

        /*
         * Already correctly formatted.
         */

    } else {

        showMessage(
            message,
            "Enter a valid Kenyan M-Pesa number, for example 0712345678.",
            "error"
        );

        return;
    }


    /*
     * Verify authenticated user.
     */

    if (!supabaseClient) {

        showMessage(
            message,
            "Supabase is not available. Please refresh the page.",
            "error"
        );

        return;
    }


    let user = null;

    try {

        user =
            await getCurrentUser();

    } catch (error) {

        console.error(
            "User verification error:",
            error
        );
    }


    if (!user) {

        showMessage(
            message,
            "Please log in before making a payment.",
            "error"
        );

        setTimeout(
            function () {
                redirectToLogin();
            },
            1000
        );

        return;
    }


    /*
     * Prevent duplicate payment request.
     */

    paymentInProgress = true;


    if (payButton) {

        payButton.disabled =
            true;

        payButton.style.opacity =
            "0.7";

        payButton.textContent =
            "Sending M-Pesa Prompt...";
    }


    showMessage(
        message,
        "Sending M-Pesa payment request...",
        "info"
    );


    try {

        /*
         * IMPORTANT:
         *
         * Do NOT send the amount from the browser.
         *
         * The Edge Function should determine
         * the correct price for the selected plan.
         */

        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/mpesa-payment`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        phone: phone,

                        plan: plan
                    })
                }
            );


        let result = null;

        try {

            result =
                await response.json();

        } catch (jsonError) {

            console.error(
                "Payment response was not valid JSON:",
                jsonError
            );
        }


        if (!response.ok) {

            console.error(
                "M-Pesa request failed:",
                result
            );

            showMessage(
                message,
                result?.error ||
                result?.message ||
                "M-Pesa payment request failed. Please try again.",
                "error"
            );

            return;
        }


        /*
         * Successful Edge Function response.
         *
         * IMPORTANT:
         * Do not unlock premium here.
         *
         * Premium access must come from the
         * verified subscription record.
         */

        if (
            result?.success === true ||
            result?.resultCode === 0
        ) {

            showMessage(
                message,
                `M-Pesa prompt sent. Check ${phone} and enter your M-Pesa PIN to complete the ${plan} payment.`,
                "success"
            );

            return;
        }


        showMessage(
            message,
            result?.error ||
            result?.message ||
            result?.resultDescription ||
            "Payment request could not be completed.",
            "error"
        );

    } catch (error) {

        console.error(
            "M-Pesa request error:",
            error
        );

        showMessage(
            message,
            "Unable to connect to the payment service. Please try again.",
            "error"
        );

    } finally {

        paymentInProgress =
            false;

        if (payButton) {

            payButton.disabled =
                false;

            payButton.style.opacity =
                "1";

            payButton.textContent =
                "Pay with M-Pesa";
        }
    }
}


/*
 * Make startPayment available to payment.html
 * when it uses onclick="startPayment()".
 */

window.startPayment =
    startPayment;


/* =========================================================
   14. ACCOUNT PAGE QUICK ACTIONS / NAVIGATION
   ========================================================= */

function protectAuthenticatedPage() {

    if (!supabaseClient) {
        return;
    }

    /*
     * Only pages explicitly marked with
     * data-auth-page="true" are protected here.
     *
     * This lets us protect Analysis, Results and Plans
     * later without breaking public pages.
     */

    const page =
        document.body?.dataset?.authPage;

    if (page !== "true") {
        return;
    }

    getCurrentUser()
        .then(
            function (user) {

                if (!user) {
                    redirectToLogin();
                }
            }
        )
        .catch(
            function (error) {

                console.error(
                    "Protected page check failed:",
                    error
                );

                redirectToLogin();
            }
        );
}


/* =========================================================
   15. SUPABASE AUTH STATE MONITOR
   ========================================================= */

if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
        function (event, session) {

            /*
             * We intentionally do not automatically redirect
             * on every auth event.
             *
             * This prevents password recovery and email
             * verification flows from being interrupted.
             */

            if (
                event === "SIGNED_OUT"
            ) {

                /*
                 * If currently on account page,
                 * return to login.
                 */

                if (
                    window.location.pathname
                        .toLowerCase()
                        .includes("account.html")
                ) {

                    redirectToLogin();
                }
            }
        }
    );
}


/* =========================================================
   16. PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Account page.
         */

        if (
            getElement("accountName") ||
            getElement("accountEmail") ||
            getElement("subscriptionPlan")
        ) {

            loadAccount();
        }


        /*
         * Protected pages.
         */

        protectAuthenticatedPage();
    }
);