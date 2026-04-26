require("dotenv").config();
const express   = require("express");
const crypto    = require("crypto");
const nodemailer= require("nodemailer");
const fetch     = require("node-fetch");
const path      = require("path");

const app    = express();
const SECRET = process.env.PAYSTACK_SECRET_KEY;
const SELF   = "https://paystack-server-production-a0ee.up.railway.app";

app.use("/webhook/paystack", express.raw({ type: "application/json" }));
app.use(express.json());

/* ── CORS so BD iframe can call /verify ─────────────────────────────────── */
app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

/* ── PLANS ──────────────────────────────────────────────────────────────── */
var PLANS = {
  pro:  { label: "Professional Agent Plan", monthly: 15000, yearly: 156600 },
  biz:  { label: "Business Partner Plan",   monthly: 50000, yearly: 522000 }
};

/* ── PAYMENT PAGE (served from Railway — bypasses BD restrictions) ───────── */
app.get("/payment", function(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PropertyConnect.ng — Membership Payment</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#1a1a1a;background:#fff;padding:24px 20px 40px}
  h2{font-size:22px;font-weight:bold;text-align:center;margin-bottom:6px}
  .sub{text-align:center;color:#666;font-size:14px;margin-bottom:18px}
  hr{border:none;border-top:1px solid #e5e5e5;margin:0 0 20px}

  /* toggle */
  .tog-row{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:22px}
  .tog-lbl{font-size:14px;color:#999}
  .tog-lbl.on{color:#1a6b3c;font-weight:bold}
  .track{width:52px;height:28px;background:#ccc;border-radius:14px;position:relative;cursor:pointer;flex-shrink:0;transition:background .25s}
  .track.on{background:#1a6b3c}
  .thumb{width:22px;height:22px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:left .25s;box-shadow:0 1px 4px rgba(0,0,0,.25)}
  .track.on .thumb{left:27px}
  .save-pill{background:#e6f4ea;color:#1a6b3c;font-size:11px;font-weight:bold;padding:3px 9px;border-radius:20px}

  /* cards */
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
  .card{border:2px solid #e0e0e0;border-radius:12px;padding:18px 14px;cursor:pointer;text-align:center;background:#fff;position:relative;transition:border-color .2s,background .2s}
  .card.active{border-color:#1a6b3c;background:#f0fff4}
  .badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#1a6b3c;color:#fff;font-size:10px;font-weight:bold;padding:3px 12px;border-radius:20px;white-space:nowrap}
  .plan-name{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:10px}
  .price{font-size:28px;font-weight:bold;color:#1a6b3c;line-height:1}
  .period{font-size:12px;color:#888;margin-top:4px}
  .saving{font-size:11px;color:#1a6b3c;background:#e6f4ea;border-radius:4px;padding:2px 8px;margin-top:8px;display:none}
  .original{font-size:11px;color:#bbb;text-decoration:line-through;margin-top:3px;display:none}
  .features{margin-top:12px;font-size:12px;color:#444;text-align:left;line-height:1.9}

  /* free nudge */
  .free-note{background:#f7f7f7;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#555;text-align:center}
  .free-note a{color:#1a6b3c;font-weight:bold;text-decoration:none}

  /* form */
  input{width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:11px;font-family:Arial,sans-serif;outline:none}
  input:focus{border-color:#1a6b3c}

  /* button */
  #pay-btn{width:100%;padding:14px;background:#bbb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:not-allowed;font-family:Arial,sans-serif}
  #pay-btn.ready{background:#1a6b3c;cursor:pointer}
  #pay-btn.done{background:#0f4a28;cursor:default}

  #pay-msg{margin-top:14px;text-align:center;font-size:13px;line-height:1.5;min-height:20px}
  .footer-note{text-align:center;font-size:11px;color:#bbb;margin-top:12px}

  @media(max-width:480px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>

<h2>Complete Your Membership</h2>
<p class="sub">Secure Naira payment via Paystack &#128274;</p>
<hr/>

<!-- BILLING TOGGLE -->
<div class="tog-row">
  <span id="lbl-m" class="tog-lbl on">Monthly</span>
  <div id="track" class="track"><div class="thumb"></div></div>
  <span id="lbl-y" class="tog-lbl">Yearly</span>
  <span class="save-pill">Save 13%</span>
</div>

<!-- PLAN CARDS -->
<div class="grid">

  <div id="card-pro" class="card">
    <div class="plan-name">Professional Agent</div>
    <div id="pr-price" class="price">&#8358;15,000</div>
    <div id="pr-period" class="period">per month</div>
    <div id="pr-saving" class="saving">Billed as &#8358;156,600/yr</div>
    <div id="pr-orig"   class="original">Was &#8358;180,000/yr</div>
    <div class="features">
      &#10003; Up to 20 listings<br>
      &#10003; Verified agent badge<br>
      &#10003; Priority placement<br>
      &#10003; Buyer &amp; tenant leads
    </div>
  </div>

  <div id="card-biz" class="card">
    <div class="badge">Most Popular</div>
    <div class="plan-name">Business Partner</div>
    <div id="biz-price" class="price">&#8358;50,000</div>
    <div id="biz-period" class="period">per month</div>
    <div id="biz-saving" class="saving">Billed as &#8358;522,000/yr</div>
    <div id="biz-orig"   class="original">Was &#8358;600,000/yr</div>
    <div class="features">
      &#10003; Unlimited listings<br>
      &#10003; Homepage spotlight<br>
      &#10003; Co-branding &amp; media<br>
      &#10003; Dedicated WhatsApp support
    </div>
  </div>

</div>

<div class="free-note">
  Only need basic access? &nbsp;<a href="https://www.propertyconnect.ng/join">Join free here &rarr;</a>
</div>

<input id="pc-name"  type="text"  placeholder="Your full name" />
<input id="pc-email" type="email" placeholder="Your email address" />
<button id="pay-btn">Select a plan to continue</button>
<div id="pay-msg"></div>
<p class="footer-note">&#128274; Secured by Paystack &nbsp;|&nbsp; SSL Encrypted &nbsp;|&nbsp; No card data stored</p>

<script src="https://js.paystack.co/v1/inline.js"></script>
<script>
  var PUB  = "pk_test_c0eb42facba648a6b6b6332067a4c31b3cc3fc48";
  var BASE = "${SELF}";

  var PLANS = {
    pro:  { label:"Professional Agent Plan", monthly:15000,  yearly:156600 },
    biz:  { label:"Business Partner Plan",   monthly:50000,  yearly:522000 }
  };

  var billing = "monthly";
  var chosen  = null;

  var track   = document.getElementById("track");
  var lblM    = document.getElementById("lbl-m");
  var lblY    = document.getElementById("lbl-y");
  var cardPro = document.getElementById("card-pro");
  var cardBiz = document.getElementById("card-biz");
  var btn     = document.getElementById("pay-btn");
  var msgEl   = document.getElementById("pay-msg");

  /* ── TOGGLE ── */
  track.addEventListener("click", function() {
    billing = billing === "monthly" ? "yearly" : "monthly";
    var y   = billing === "yearly";

    track.classList.toggle("on", y);
    lblM.classList.toggle("on", !y);
    lblY.classList.toggle("on",  y);

    document.getElementById("pr-price").innerHTML  = "&#8358;" + PLANS.pro[billing].toLocaleString();
    document.getElementById("biz-price").innerHTML = "&#8358;" + PLANS.biz[billing].toLocaleString();
    document.getElementById("pr-period").textContent  = y ? "per year" : "per month";
    document.getElementById("biz-period").textContent = y ? "per year" : "per month";

    ["pr-saving","pr-orig","biz-saving","biz-orig"].forEach(function(id) {
      document.getElementById(id).style.display = y ? "block" : "none";
    });
    refreshBtn();
  });

  /* ── PLAN CLICK ── */
  cardPro.addEventListener("click", function() { pick("pro"); });
  cardBiz.addEventListener("click", function() { pick("biz"); });

  function pick(key) {
    chosen = key;
    cardPro.classList.toggle("active", key === "pro");
    cardBiz.classList.toggle("active", key === "biz");
    refreshBtn();
  }

  function refreshBtn() {
    if (!chosen) return;
    var amt    = PLANS[chosen][billing];
    var period = billing === "yearly" ? "/yr" : "/mo";
    btn.textContent = "Pay \u20A6" + amt.toLocaleString() + period + "  \u2014  " + PLANS[chosen].label;
    btn.className   = "ready";
  }

  /* ── PAY ── */
  btn.addEventListener("click", function() {
    if (!chosen) { show("Please select a plan first.", "crimson"); return; }
    var name  = document.getElementById("pc-name").value.trim();
    var email = document.getElementById("pc-email").value.trim();
    if (!name)  { show("Please enter your full name.", "crimson"); return; }
    if (!email || !email.includes("@")) { show("Please enter a valid email.", "crimson"); return; }

    var amt   = PLANS[chosen][billing];
    var label = PLANS[chosen].label + " (" + billing + ")";
    var ref   = "PC_" + Date.now() + "_" + Math.floor(Math.random()*9999);

    PaystackPop.setup({
      key: PUB, email: email, amount: amt * 100, currency: "NGN", ref: ref,
      metadata: {
        name: name, plan: label, billing: billing,
        custom_fields: [
          {display_name:"Name",    variable_name:"name",    value:name},
          {display_name:"Plan",    variable_name:"plan",    value:label},
          {display_name:"Billing", variable_name:"billing", value:billing}
        ]
      },
      callback: function(r) {
        btn.disabled = true;
        show("Verifying payment, please wait...", "#1a6b3c");
        verify(r.reference);
      },
      onClose: function() { show("Window closed — click the button again to retry.", "orange"); }
    }).openIframe();
  });

  /* ── VERIFY ── */
  function verify(ref) {
    fetch(BASE + "/verify/" + ref)
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d.success) {
          show("\u2705 Payment of \u20A6" + d.amount.toLocaleString() + " confirmed! Receipt sent to your email. Ref: " + d.reference, "#1a6b3c");
          btn.textContent = "\u2705 Payment Complete";
          btn.className   = "done";
        } else {
          btn.disabled = false;
          show("Could not verify. Contact support with ref: " + ref, "crimson");
        }
      })
      .catch(function(){
        btn.disabled = false;
        show("Network error. Contact support with ref: " + ref, "orange");
      });
  }

  function show(txt, color) { msgEl.textContent = txt; msgEl.style.color = color||"#333"; }
</script>
</body>
</html>`);
});

/* ── WEBHOOK ─────────────────────────────────────────────────────────────── */
app.post("/webhook/paystack", function(req, res) {
  var hash = crypto.createHmac("sha512", SECRET).update(req.body).digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) return res.status(401).send("Unauthorized");

  var event = JSON.parse(req.body);
  console.log("Webhook:", event.event, "|", event.data.reference);

  if (event.event === "charge.success") {
    var d         = event.data;
    var amtNGN    = d.amount / 100;
    var email     = d.customer.email;
    var name      = d.metadata && d.metadata.name    || "Member";
    var plan      = d.metadata && d.metadata.plan    || "Membership";
    var billing   = d.metadata && d.metadata.billing || "monthly";
    var ref       = d.reference;

    console.log("PAID | " + name + " | " + email + " | " + plan + " | NGN " + amtNGN);

    if (process.env.YOUR_EMAIL && process.env.YOUR_EMAIL_PASSWORD) {
      var mailer = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.YOUR_EMAIL, pass: process.env.YOUR_EMAIL_PASSWORD }
      });

      /* receipt to customer */
      mailer.sendMail({
        from: '"PropertyConnect.ng" <' + process.env.YOUR_EMAIL + '>',
        to: email,
        subject: "Payment Confirmed — " + plan,
        html: "<div style='font-family:Arial;max-width:600px;margin:auto;padding:20px'>" +
          "<h2 style='color:#1a6b3c'>Payment Confirmed &#10003;</h2>" +
          "<p>Hello <strong>" + name + "</strong>,</p>" +
          "<p>Your payment of <strong>&#8358;" + amtNGN.toLocaleString() + "</strong> for <strong>" + plan + "</strong> is confirmed.</p>" +
          "<table style='border-collapse:collapse;width:100%;margin:16px 0'>" +
          "<tr style='background:#f5f5f5'><td style='padding:10px;border:1px solid #ddd'>Plan</td><td style='padding:10px;border:1px solid #ddd'>" + plan + "</td></tr>" +
          "<tr><td style='padding:10px;border:1px solid #ddd'>Billing</td><td style='padding:10px;border:1px solid #ddd'>" + billing + "</td></tr>" +
          "<tr style='background:#f5f5f5'><td style='padding:10px;border:1px solid #ddd'>Amount</td><td style='padding:10px;border:1px solid #ddd'>&#8358;" + amtNGN.toLocaleString() + "</td></tr>" +
          "<tr><td style='padding:10px;border:1px solid #ddd'>Reference</td><td style='padding:10px;border:1px solid #ddd;font-family:monospace'>" + ref + "</td></tr>" +
          "</table><p>Welcome to PropertyConnect.ng!</p></div>"
      }).catch(function(e){ console.log("Email err:", e.message); });

      /* admin alert */
      mailer.sendMail({
        from: '"Payment Alert" <' + process.env.YOUR_EMAIL + '>',
        to: process.env.YOUR_EMAIL,
        subject: "New Payment: NGN " + amtNGN + " — " + plan,
        html: "<p><b>New payment!</b><br>Name: " + name + "<br>Email: " + email + "<br>Plan: " + plan + "<br>Amount: NGN " + amtNGN + "<br>Ref: " + ref + "</p>"
      }).catch(function(){});
    }
  }

  res.sendStatus(200);
});

/* ── VERIFY ENDPOINT ─────────────────────────────────────────────────────── */
app.get("/verify/:ref", function(req, res) {
  fetch("https://api.paystack.co/transaction/verify/" + req.params.ref, {
    headers: { Authorization: "Bearer " + SECRET }
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.data && result.data.status === "success") {
      res.json({ success:true, amount: result.data.amount/100, reference: result.data.reference, email: result.data.customer.email });
    } else {
      res.json({ success:false });
    }
  })
  .catch(function(e){ res.status(500).json({ success:false, error:e.message }); });
});

/* ── HEALTH ──────────────────────────────────────────────────────────────── */
app.get("/", function(req, res){ res.send("PropertyConnect Paystack Server OK"); });

app.listen(process.env.PORT || 3000, function(){
  console.log("Server running on port", process.env.PORT || 3000);
});
