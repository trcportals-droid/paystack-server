require("dotenv").config();
const express = require("express");
const crypto  = require("crypto");
const nodemailer = require("nodemailer");
const fetch   = require("node-fetch");

const app = express();

// Raw body required for Paystack HMAC signature verification
app.use("/webhook/paystack", express.raw({ type: "application/json" }));
app.use(express.json());

const SECRET = process.env.PAYSTACK_SECRET_KEY;

// ── PLAN DEFINITIONS ──────────────────────────────────────────────────────────
// All amounts in NAIRA (server converts to kobo when needed)
const PLANS = {
  "Professional Monthly": {
    amount:      2500,
    billing:     "monthly",
    description: "Professional Plan — billed monthly"
  },
  "Professional Yearly": {
    amount:      26100,     // 2500 x 12 = 30000, minus 13% = 26100
    billing:     "yearly",
    description: "Professional Plan — billed yearly (save 13%)"
  },
  "Enterprise Monthly": {
    amount:      5000,
    billing:     "monthly",
    description: "Enterprise Plan — billed monthly"
  },
  "Enterprise Yearly": {
    amount:      52200,     // 5000 x 12 = 60000, minus 13% = 52200
    billing:     "yearly",
    description: "Enterprise Plan — billed yearly (save 13%)"
  }
};

// ── EMAIL SETUP ───────────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.YOUR_EMAIL,
    pass: process.env.YOUR_EMAIL_PASSWORD
  }
});

// ── WEBHOOK ENDPOINT ──────────────────────────────────────────────────────────
app.post("/webhook/paystack", (req, res) => {

  // 1. Verify the request genuinely came from Paystack
  const hash = crypto
    .createHmac("sha512", SECRET)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    console.log("REJECTED: Invalid Paystack signature");
    return res.status(401).send("Unauthorized");
  }

  // 2. Parse event
  const event = JSON.parse(req.body);
  console.log("Webhook received:", event.event, "| Ref:", event.data?.reference);

  // 3. Route by event type
  switch (event.event) {

    case "charge.success":
      handleSuccessfulPayment(event.data);
      break;

    case "charge.failed":
      console.log("Payment FAILED | Email:", event.data.customer?.email,
                  "| Ref:", event.data.reference);
      break;

    default:
      console.log("Unhandled event type:", event.event);
  }

  // Always respond 200 immediately — Paystack retries if it doesn't get this
  res.sendStatus(200);
});

// ── HANDLE SUCCESSFUL PAYMENT ─────────────────────────────────────────────────
function handleSuccessfulPayment(data) {
  const amountNGN  = data.amount / 100;                   // Paystack sends kobo
  const email      = data.customer.email;
  const name       = data.metadata?.name        || "Valued Member";
  const plan       = data.metadata?.plan        || "Membership";
  const billing    = data.metadata?.billing     || "monthly";
  const ref        = data.reference;

  console.log("─────────────────────────────────────");
  console.log("PAYMENT CONFIRMED");
  console.log("Customer:", name, "<" + email + ">");
  console.log("Plan:    ", plan);
  console.log("Billing: ", billing);
  console.log("Amount:  ₦" + amountNGN.toLocaleString());
  console.log("Ref:     ", ref);
  console.log("─────────────────────────────────────");

  // Send confirmation email to customer
  const nextBillingNote = billing === "yearly"
    ? "Your membership is active for 12 months."
    : "Your membership renews monthly.";

  mailer.sendMail({
    from: `"Your Brand Name" <${process.env.YOUR_EMAIL}>`,
    to: email,
    subject: `Payment Confirmed — ${plan} ✅`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#006400;">Payment Confirmed ✅</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>
          Thank you for your payment. Your <strong>${plan}</strong> membership
          is now active.
        </p>
        <table style="border-collapse:collapse;width:100%;margin:20px 0;">
          <tr style="background:#f5f5f5;">
            <td style="padding:10px;border:1px solid #ddd;"><strong>Plan</strong></td>
            <td style="padding:10px;border:1px solid #ddd;">${plan}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;"><strong>Billing</strong></td>
            <td style="padding:10px;border:1px solid #ddd;">${billing === "yearly" ? "Yearly" : "Monthly"}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px;border:1px solid #ddd;"><strong>Amount Paid</strong></td>
            <td style="padding:10px;border:1px solid #ddd;">₦${amountNGN.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;"><strong>Reference</strong></td>
            <td style="padding:10px;border:1px solid #ddd;font-family:monospace;">${ref}</td>
          </tr>
        </table>
        <p>${nextBillingNote}</p>
        <p>
          If you have any questions, simply reply to this email and we will
          be happy to help.
        </p>
        <p style="color:#555;">— Your Brand Team</p>
      </div>
    `
  }).then(() => {
    console.log("Confirmation email sent to:", email);
  }).catch(err => {
    console.log("Email error:", err.message);
  });

  // Notify yourself of every new payment
  mailer.sendMail({
    from: `"Payment Alert" <${process.env.YOUR_EMAIL}>`,
    to:   process.env.YOUR_EMAIL,
    subject: `New Payment: ₦${amountNGN.toLocaleString()} — ${plan} (${billing})`,
    html: `
      <p><strong>New payment received!</strong></p>
      <p>Customer: ${name} (${email})</p>
      <p>Plan: ${plan}</p>
      <p>Billing: ${billing}</p>
      <p>Amount: ₦${amountNGN.toLocaleString()}</p>
      <p>Reference: <code>${ref}</code></p>
    `
  }).catch(() => {});
}

// ── VERIFY ENDPOINT ───────────────────────────────────────────────────────────
// Called from your Brilliant Directories payment page after Paystack popup closes
app.get("/verify/:reference", async (req, res) => {
  // Add CORS header so your BD site can call this
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${SECRET}` } }
    );
    const result = await response.json();

    if (result.data && result.data.status === "success") {
      res.json({
        success:  true,
        amount:   result.data.amount / 100,
        reference: result.data.reference,
        email:    result.data.customer.email,
        plan:     result.data.metadata?.plan    || "",
        billing:  result.data.metadata?.billing || ""
      });
    } else {
      res.json({ success: false, status: result.data?.status || "unknown" });
    }
  } catch (err) {
    console.log("Verify error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PLANS ENDPOINT ────────────────────────────────────────────────────────────
// Optional: lets your frontend fetch current prices from the server
app.get("/plans", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(PLANS);
});

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Paystack Webhook Server OK — Plans: " + Object.keys(PLANS).join(", "));
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("Plans loaded:", Object.keys(PLANS).length);
  Object.entries(PLANS).forEach(([name, p]) => {
    console.log(` - ${name}: ₦${p.amount.toLocaleString()} (${p.billing})`);
  });
});
