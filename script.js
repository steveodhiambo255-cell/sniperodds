// ==========================================
// SNIPER ODDS - MAIN SCRIPT
// ==========================================
// Used by:
// login, signup, payment, subscription,
// account and premium prediction pages.
//
// IMPORTANT:
// M-Pesa payment amount is NOT trusted from
// the browser. The Edge Function obtains the
// official price from Supabase.
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
        "Supabase library did not load. Check the script tag."
    );

} else {

    window.supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
}


const supabaseClient =
    window.supabaseClient;


// ==========================================
// HTML ESCAPE HELPER
// ==========================================

function escapeHtml(value) {

    return String(
        value === null || value === undefined
            ? ""
            : value
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// ==========================================
// PAYMENT PAGE - DISPLAY SELECTED PLAN
// ==========================================

const selectedPlanElement =
    document.getElementById("selectedPlan");

const selectedAmountElement =
    document.getElementById("selectedAmount");


if (
    selectedPlanElement &&
    selectedAmountElement
) {

    const plan =
        localStorage.getItem("selectedPlan");

    const amount =
        localStorage.getItem("selectedAmount");


    if (plan && amount) {

        selectedPlanElement.textContent =
            plan;

        selectedAmountElement.textContent =
            "KSh " +
            Number(amount).toLocaleString();

    } else {

        selectedPlanElement.textContent =
            "No plan selected";

        selectedAmountElement.textContent =
            "KSh 0";
    }
}


// ==========================================
// M-PESA PAYMENT
// ==========================================

let paymentInProgress = false;


window.startPayment = async function () {

    /*
     * HARD DUPLICATE PROTECTION
     *
     * If the customer taps the button several
     * times while the first request is running,
     * only the first request is allowed through.
     */

    if (paymentInProgress) {
        return;
    }


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
        phoneInput.value
            .trim()
            .replace(/\D/g, "");


    const plan =
        localStorage.getItem("selectedPlan");


    // ------------------------------------------
    // CHECK PLAN
    // ------------------------------------------

    if (!plan) {

        message.textContent =
            "Please select a subscription plan first.";

        return;
    }


    // ------------------------------------------
    // CHECK PHONE
    // ------------------------------------------

    if (!/^07\d{8}$/.test(phone)) {

        message.textContent =
            "Enter a valid M-Pesa number, e.g. 0712345678.";

        return;
    }


    // ------------------------------------------
    // CHECK SUPABASE
    // ------------------------------------------

    if (!supabaseClient) {

        message.textContent =
            "Unable to connect to Supabase. Please refresh the page.";

        return;
    }


    /*
     * Convert:
     *
     * 0712345678
     *
     * into:
     *
     * 254712345678
     */

    const mpesaPhone =
        "254" + phone.substring(1);


    // ------------------------------------------
    // LOCK PAYMENT BUTTON
    // ------------------------------------------

    paymentInProgress = true;


    if (payButton) {

        payButton.disabled = true;

        payButton.textContent =
            "Sending M-Pesa Prompt...";
    }


    message.textContent =
        "Please wait. Connecting to M-Pesa...";


    try {

        // --------------------------------------
        // VERIFY LOGIN SESSION
        // --------------------------------------

        const {
            data: {
                session
            },
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {

            throw new Error(
                "Unable to verify your account."
            );
        }


        if (!session) {

            window.location.href =
                "login.html";

            return;
        }


        // --------------------------------------
        // CALL EDGE FUNCTION
        // --------------------------------------
        //
        // IMPORTANT:
        // We deliberately DO NOT send amount.
        //
        // The Edge Function gets the official
        // price from public.plans.
        // --------------------------------------

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "mpesa-payment",
                {
                    body: {

                        phone: mpesaPhone,

                        plan: plan

                    }
                }
            );


        // --------------------------------------
        // HANDLE FUNCTION ERROR
        // --------------------------------------

        if (error) {

            console.error(
                "M-Pesa function error:",
                error
            );


            let detail =
                error.message ||
                "Payment request failed.";


            try {

                if (error.context) {

                    const responseBody =
                        await error.context.json();

                    if (responseBody?.error) {

                        detail =
                            responseBody.error;
                    }
                }

            } catch (e) {

                console.warn(
                    "Could not read function error body."
                );
            }


            message.textContent =
                "Payment failed: " + detail;


            paymentInProgress = false;


            if (payButton) {

                payButton.disabled = false;

                payButton.textContent =
                    "Pay with M-Pesa";
            }


            return;
        }


        // --------------------------------------
        // LOG RESPONSE FOR DEBUGGING
        // --------------------------------------

        console.log(
            "SNIPER ODDS M-Pesa response:",
            data
        );


        // --------------------------------------
        // SUCCESS
        // --------------------------------------

        if (
            data &&
            data.success === true
        ) {

            if (payButton) {

                payButton.disabled = true;

                payButton.textContent =
                    "M-Pesa Prompt Sent ✓";
            }


            message.textContent =
                "M-Pesa prompt sent. Check your phone and enter your M-Pesa PIN.";


            /*
             * IMPORTANT:
             *
             * Do NOT unlock premium here.
             *
             * Premium access should only be granted
             * after the Safaricom callback confirms
             * successful payment on the server.
             */

            return;
        }


        // --------------------------------------
        // UNSUCCESSFUL RESPONSE
        // --------------------------------------

        message.textContent =
            data?.error ||
            "M-Pesa request was not accepted. Please try again.";


        paymentInProgress = false;


        if (payButton) {

            payButton.disabled = false;

            payButton.textContent =
                "Pay with M-Pesa";
        }


    } catch (error) {

        console.error(
            "SNIPER ODDS payment error:",
            error
        );


        message.textContent =
            error?.message ||
            "System error. Please try again.";


        paymentInProgress = false;


        if (payButton) {

            payButton.disabled = false;

            payButton.textContent =
                "Pay with M-Pesa";
        }
    }

};


// ==========================================
// LOGIN
// ==========================================

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            const message =
                document
                    .getElementById("loginMessage");


            message.textContent =
                "Logging in...";


            try {

                const {
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({

                            email: email,

                            password: password

                        });


                if (error) {

                    message.textContent =
                        "Login failed: " +
                        error.message;

                    return;
                }


                message.textContent =
                    "Login successful! Redirecting...";


                setTimeout(
                    function () {

                        window.location.replace(
                            "account.html"
                        );

                    },
                    300
                );


            } catch (error) {

                message.textContent =
                    "System error: " +
                    error.message;
            }

        }
    );

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


    if (
        !accountName ||
        !accountEmail
    ) {
        return;
    }


    try {

        let session = null;


        try {

            const result =
                await Promise.race([

                    supabaseClient.auth
                        .getSession(),

                    new Promise(
                        function (_, reject) {

                            setTimeout(
                                function () {

                                    reject(
                                        new Error(
                                            "timeout"
                                        )
                                    );

                                },
                                4000
                            );

                        }
                    )

                ]);


            session =
                result.data.session;


        } catch (e) {

            console.warn(
                "Session check slow:",
                e.message
            );
        }


        if (!session) {

            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        800
                    );

                }
            );


            ({
                data: {
                    session
                }
            } =
                await supabaseClient.auth
                    .getSession());
        }


        const user =
            session
                ? session.user
                : null;


        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        // --------------------------------------
        // ACCOUNT INFORMATION
        // --------------------------------------

        accountEmail.textContent =
            user.email ||
            "Not available";


        accountName.textContent =
            (
                user.user_metadata &&
                user.user_metadata.name
            ) ||
            "Member";


        // --------------------------------------
        // ACTIVE SUBSCRIPTION
        // --------------------------------------

        const {
            data: subscription,
            error: subscriptionError
        } =
            await supabaseClient
                .from("subscriptions")
                .select(
                    "plan, amount, status, started_at, expires_at"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "status",
                    "active"
                )
                .gt(
                    "expires_at",
                    new Date().toISOString()
                )
                .order(
                    "expires_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();


        if (subscriptionError) {

            console.error(
                "Subscription error:",
                subscriptionError
            );

            return;
        }


        if (subscription) {

            // ----------------------------------
            // ACTIVE
            // ----------------------------------

            if (upgradeButton) {

                upgradeButton.style.display =
                    "none";
            }


            const premiumTitle =
                document.getElementById(
                    "premiumTitle"
                );


            const premiumMessage =
                document.getElementById(
                    "premiumMessage"
                );


            const premiumButton =
                document.getElementById(
                    "premiumButton"
                );


            const premiumContent =
                document.getElementById(
                    "premiumContent"
                );


            if (premiumTitle) {

                premiumTitle.textContent =
                    "Premium Picks Unlocked";
            }


            if (premiumMessage) {

                premiumMessage.textContent =
                    "Your subscription is active. Premium football selections are now unlocked.";
            }


            if (premiumButton) {

                premiumButton.style.display =
                    "none";
            }


            if (premiumContent) {

                premiumContent.classList.remove(
                    "premium-locked"
                );
            }


            if (subscriptionPlan) {

                subscriptionPlan.textContent =
                    subscription.plan;
            }


            if (subscriptionBadge) {

                subscriptionBadge.textContent =
                    "ACTIVE";
            }


            const subscriptionText =
                document.querySelector(
                    ".subscription-text"
                );


            if (subscriptionText) {

                subscriptionText.textContent =
                    "Your premium subscription is active.";
            }


            console.log(
                "Active subscription:",
                subscription
            );


        } else {

            // ----------------------------------
            // FREE
            // ----------------------------------

            if (subscriptionPlan) {

                subscriptionPlan.textContent =
                    "Free";
            }


            if (subscriptionBadge) {

                subscriptionBadge.textContent =
                    "FREE";
            }
        }


    } catch (error) {

        console.error(
            "Account loading error:",
            error
        );


        accountName.textContent =
            "Unable to load";


        accountEmail.textContent =
            "Unable to load";
    }

}


loadAccount();


// ==========================================
// LOAD PREMIUM PREDICTIONS
// ==========================================

async function loadPremiumPredictions() {

    const premiumContent =
        document.getElementById(
            "premiumContent"
        );


    if (!premiumContent) {
        return;
    }


    try {

        const {
            data: predictions,
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

            return;
        }


        if (
            !predictions ||
            predictions.length === 0
        ) {

            premiumContent.innerHTML = `

                <div class="big-lock">
                    🎯
                </div>

                <h3>
                    Premium Predictions
                </h3>

                <p>
                    No premium selections have
                    been published yet.
                </p>

            `;

            return;
        }


        premiumContent.innerHTML = "";


        predictions.forEach(
            function (prediction) {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "prediction-card";


                const marketHtml =
                    prediction.market
                        ? `
                            <div class="prediction-market">
                                ${escapeHtml(
                                    prediction.market
                                )}
                            </div>
                          `
                        : "";


                const titleHtml =
                    prediction.player
                        ? `
                            <h3>
                                👤
                                ${escapeHtml(
                                    prediction.player
                                )}
                            </h3>
                          `
                        : `
                            <h3>
                                ⚽
                                ${escapeHtml(
                                    prediction.home_team
                                )}
                                vs
                                ${escapeHtml(
                                    prediction.away_team
                                )}
                            </h3>
                          `;


                const oddsHtml =
                    prediction.odds
                        ? `
                            <p>
                                <strong>
                                    💰 Odds:
                                </strong>
                                ${escapeHtml(
                                    prediction.odds
                                )}
                            </p>
                          `
                        : "";


                const analysisHtml =
                    prediction.analysis
                        ? `
                            <p class="prediction-analysis">
                                📊
                                ${escapeHtml(
                                    prediction.analysis
                                )}
                            </p>
                          `
                        : "";


                card.innerHTML = `

                    <div class="prediction-date">
                        ${escapeHtml(
                            prediction.match_date
                        )}
                    </div>

                    ${marketHtml}

                    ${titleHtml}

                    <p>
                        <strong>
                            🎯 Prediction:
                        </strong>
                        ${escapeHtml(
                            prediction.prediction
                        )}
                    </p>

                    ${oddsHtml}

                    ${analysisHtml}

                `;


                premiumContent.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Premium prediction loading error:",
            error
        );
    }
}


loadPremiumPredictions();