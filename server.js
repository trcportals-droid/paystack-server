require("dotenv").config();
const express    = require("express");
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const fetch      = require("node-fetch");

const app    = express();
const SECRET = process.env.PAYSTACK_SECRET_KEY;
const SELF   = process.env.SERVER_URL || "https://paystack-server-pcuc.onrender.com";
const BD_SIGNUP_URL = "https://www.propertyconnect.ng/checkout/5";

app.use("/webhook/paystack", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

/* =========================================================
   PAYMENT PAGE — served from Railway, embedded in BD iframe
   ========================================================= */
app.get("/payment", function(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "ALLOWALL");

  var html = '<!DOCTYPE html>' +
'<html lang="en"><head>' +
'<meta charset="UTF-8"/>' +
'<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
'<title>PropertyConnect.ng Payment</title>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:Arial,sans-serif;color:#1a1a1a;background:#fff;padding:24px 20px 40px}' +
'h2{font-size:22px;font-weight:bold;text-align:center;margin-bottom:6px}' +
'.sub{text-align:center;color:#666;font-size:14px;margin-bottom:18px}' +
'hr{border:none;border-top:1px solid #e5e5e5;margin:0 0 20px}' +
'.tog-row{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap}' +
'.tog-lbl{font-size:14px;color:#999}' +
'.tog-lbl.on{color:#1a6b3c;font-weight:bold}' +
'.track{width:52px;height:28px;background:#ccc;border-radius:14px;position:relative;cursor:pointer;flex-shrink:0;transition:background .25s}' +
'.track.on{background:#1a6b3c}' +
'.thumb{width:22px;height:22px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:left .25s;box-shadow:0 1px 4px rgba(0,0,0,.25)}' +
'.track.on .thumb{left:27px}' +
'.save-pill{background:#e6f4ea;color:#1a6b3c;font-size:11px;font-weight:bold;padding:3px 9px;border-radius:20px}' +
'.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}' +
'.card{border:2px solid #e0e0e0;border-radius:12px;padding:18px 14px;cursor:pointer;text-align:center;background:#fff;position:relative;transition:border-color .2s,background .2s}' +
'.card.active{border-color:#1a6b3c;background:#f0fff4}' +
'.badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#1a6b3c;color:#fff;font-size:10px;font-weight:bold;padding:3px 12px;border-radius:20px;white-space:nowrap}' +
'.plan-name{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:10px}' +
'.price{font-size:28px;font-weight:bold;color:#1a6b3c;line-height:1}' +
'.period{font-size:12px;color:#888;margin-top:4px}' +
'.saving{font-size:11px;color:#1a6b3c;background:#e6f4ea;border-radius:4px;padding:2px 8px;margin-top:8px;display:none}' +
'.was{font-size:11px;color:#bbb;text-decoration:line-through;margin-top:3px;display:none}' +
'.features{margin-top:12px;font-size:12px;color:#444;text-align:left;line-height:1.9}' +
'.free-note{background:#f7f7f7;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#555;text-align:center}' +
'.free-note a{color:#1a6b3c;font-weight:bold;text-decoration:none}' +
'input{width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:11px;font-family:Arial,sans-serif;outline:none;transition:border-color .2s}' +
'input:focus{border-color:#1a6b3c}' +
'#pay-btn{width:100%;padding:14px;background:#bbb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:not-allowed;font-family:Arial,sans-serif;transition:background .2s}' +
'#pay-btn.ready{background:#1a6b3c;cursor:pointer}' +
'#pay-btn.done{background:#0f4a28;cursor:default}' +
'#pay-msg{margin-top:14px;text-align:center;font-size:13px;line-height:1.6;min-height:20px}' +
'.footer-note{text-align:center;font-size:11px;color:#bbb;margin-top:12px}' +
'#success-screen{display:none;text-align:center;padding:10px 0}' +
'.tick{font-size:56px;margin-bottom:12px}' +
'.s-title{font-size:21px;font-weight:bold;color:#1a6b3c;margin-bottom:10px}' +
'.s-sub{font-size:14px;color:#444;line-height:1.7;margin-bottom:18px}' +
'.s-email-box{background:#f0fff4;border:2px solid #1a6b3c;border-radius:10px;padding:12px 16px;margin-bottom:18px;text-align:left}' +
'.s-email-lbl{font-size:12px;color:#555;margin-bottom:4px}' +
'.s-email-row{display:flex;align-items:center;gap:8px}' +
'.s-email-val{font-size:15px;font-weight:bold;color:#1a1a1a;flex:1;word-break:break-all}' +
'.copy-btn{background:#1a6b3c;color:#fff;border:none;border-radius:6px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;flex-shrink:0}' +
'.s-note{background:#fff8e6;border-left:4px solid #f5a623;border-radius:0 8px 8px 0;padding:10px 14px;text-align:left;font-size:13px;color:#7a5800;margin-bottom:18px;line-height:1.6}' +
'.s-btn{display:block;background:#1a6b3c;color:#fff;padding:15px 24px;border-radius:8px;font-size:15px;font-weight:bold;text-decoration:none;margin-bottom:8px}' +
'.s-btn:hover{background:#0f4a28}' +
'.s-counter{font-size:13px;color:#888;margin-bottom:16px}' +
'.ref-box{background:#f5f5f5;border-radius:8px;padding:10px 14px;font-size:11px;color:#888;text-align:left}' +
'.ref-box code{font-family:monospace;color:#333;font-size:12px}' +
'@media(max-width:460px){.grid{grid-template-columns:1fr}}' +
'</style></head><body>' +

'<div id="payment-screen">' +
'<h2>Complete Your Membership</h2>' +
'<p class="sub">Secure Naira payment via Paystack &#128274;</p>' +
'<hr/>' +
'<div class="tog-row">' +
'<span id="lbl-m" class="tog-lbl on">Monthly</span>' +
'<div id="track" class="track"><div class="thumb"></div></div>' +
'<span id="lbl-y" class="tog-lbl">Yearly</span>' +
'<span class="save-pill">Save 13%</span>' +
'</div>' +
'<div class="grid">' +
'<div id="card-pro" class="card">' +
'<div class="plan-name">Professional Agent</div>' +
'<div id="pr-price" class="price">&#8358;15,000</div>' +
'<div id="pr-period" class="period">per month</div>' +
'<div id="pr-saving" class="saving">Billed as &#8358;156,600/yr</div>' +
'<div id="pr-was" class="was">Was &#8358;180,000/yr</div>' +
'<div class="features">&#10003; Up to 20 listings<br>&#10003; Verified agent badge<br>&#10003; Priority placement<br>&#10003; Buyer &amp; tenant leads</div>' +
'</div>' +
'<div id="card-biz" class="card">' +
'<div class="badge">Most Popular</div>' +
'<div class="plan-name">Business Partner</div>' +
'<div id="biz-price" class="price">&#8358;50,000</div>' +
'<div id="biz-period" class="period">per month</div>' +
'<div id="biz-saving" class="saving">Billed as &#8358;522,000/yr</div>' +
'<div id="biz-was" class="was">Was &#8358;600,000/yr</div>' +
'<div class="features">&#10003; Unlimited listings<br>&#10003; Homepage spotlight<br>&#10003; Co-branding &amp; media<br>&#10003; Dedicated WhatsApp support</div>' +
'</div>' +
'</div>' +
'<div class="free-note">Only need basic access?&nbsp;<a href="https://www.propertyconnect.ng/join">Join free here &rarr;</a></div>' +
'<input id="pc-name" type="text" placeholder="Your full name"/>' +
'<input id="pc-email" type="email" placeholder="Your email address"/>' +
'<button id="pay-btn">Select a plan to continue</button>' +
'<div id="pay-msg"></div>' +
'<p class="footer-note">&#128274; Secured by Paystack | SSL Encrypted | No card data stored</p>' +
'</div>' +

'<div id="success-screen">' +
'<div class="tick">&#9989;</div>' +
'<div class="s-title">Payment Confirmed!</div>' +
'<div class="s-sub" id="s-sub"></div>' +
'<div class="s-email-box">' +
'<div class="s-email-lbl">Use this email on the Create Account form:</div>' +
'<div class="s-email-row">' +
'<div class="s-email-val" id="s-email-val"></div>' +
'<button class="copy-btn" id="copy-btn" onclick="doCopy()">Copy</button>' +
'</div>' +
'</div>' +
'<div class="s-note">&#9888; Enter this exact email on the next page so we can activate your paid plan within 1 hour.</div>' +
'<a id="s-btn" href="#" class="s-btn">Create My Free Account &rarr;</a>' +
'<div class="s-counter">Redirecting in <strong id="s-secs">5</strong> seconds...</div>' +
'<div class="ref-box">Payment reference: <code id="s-ref"></code></div>' +
'</div>' +

'<script src="https://js.paystack.co/v1/inline.js"></script>' +
'<script>' +
'(function(){' +
'var PUB="pk_test_c0eb42facba648a6b6b6332067a4c31b3cc3fc48";' +
'var BASE="' + SELF + '";' +
'var PLANS={' +
'  pro:{label:"Professional Agent Plan",monthly:15000,yearly:156600},' +
'  biz:{label:"Business Partner Plan",monthly:50000,yearly:522000}' +
'};' +
'var billing="monthly",chosen=null;' +
'var track=document.getElementById("track");' +
'var lblM=document.getElementById("lbl-m");' +
'var lblY=document.getElementById("lbl-y");' +
'var cardPro=document.getElementById("card-pro");' +
'var cardBiz=document.getElementById("card-biz");' +
'var btn=document.getElementById("pay-btn");' +
'var msgEl=document.getElementById("pay-msg");' +
'track.addEventListener("click",function(){' +
'  billing=(billing==="monthly")?"yearly":"monthly";' +
'  var y=(billing==="yearly");' +
'  track.classList.toggle("on",y);' +
'  lblM.classList.toggle("on",!y);' +
'  lblY.classList.toggle("on",y);' +
'  document.getElementById("pr-price").innerHTML="&#8358;"+PLANS.pro[billing].toLocaleString();' +
'  document.getElementById("biz-price").innerHTML="&#8358;"+PLANS.biz[billing].toLocaleString();' +
'  document.getElementById("pr-period").textContent=y?"per year":"per month";' +
'  document.getElementById("biz-period").textContent=y?"per year":"per month";' +
'  ["pr-saving","pr-was","biz-saving","biz-was"].forEach(function(id){document.getElementById(id).style.display=y?"block":"none";});' +
'  refreshBtn();' +
'});' +
'cardPro.addEventListener("click",function(){pick("pro");});' +
'cardBiz.addEventListener("click",function(){pick("biz");});' +
'function pick(k){chosen=k;cardPro.classList.toggle("active",k==="pro");cardBiz.classList.toggle("active",k==="biz");refreshBtn();}' +
'function refreshBtn(){if(!chosen)return;var amt=PLANS[chosen][billing];btn.textContent="Pay \u20A6"+amt.toLocaleString()+(billing==="yearly"?"/yr":"/mo")+"  \u2014  "+PLANS[chosen].label;btn.className="ready";}' +
'btn.addEventListener("click",function(){' +
'  if(!chosen){show("Please select a plan first.","crimson");return;}' +
'  var name=document.getElementById("pc-name").value.trim();' +
'  var email=document.getElementById("pc-email").value.trim();' +
'  if(!name){show("Please enter your full name.","crimson");return;}' +
'  if(!email||!email.includes("@")){show("Please enter a valid email address.","crimson");return;}' +
'  var amt=PLANS[chosen][billing];' +
'  var label=PLANS[chosen].label+" ("+billing+")";' +
'  var ref="PC_"+Date.now()+"_"+Math.floor(Math.random()*9999);' +
'  PaystackPop.setup({key:PUB,email:email,amount:amt*100,currency:"NGN",ref:ref,' +
'    metadata:{name:name,plan:label,billing:billing,custom_fields:[' +
'      {display_name:"Name",variable_name:"name",value:name},' +
'      {display_name:"Plan",variable_name:"plan",value:label},' +
'      {display_name:"Billing",variable_name:"billing",value:billing}' +
'    ]},' +
'    callback:function(r){btn.disabled=true;show("Verifying payment...","#1a6b3c");verify(r.reference,name,email,chosen,label,amt);},' +
'    onClose:function(){show("Window closed. Click the button again to retry.","orange");}' +
'  }).openIframe();' +
'});' +
'function verify(ref,name,email,planKey,label,amt){' +
'  fetch(BASE+"/verify/"+ref)' +
'  .then(function(r){return r.json();})' +
'  .then(function(d){' +
'    if(d.success){showSuccess(d.amount||amt,ref,label,email);}' +
'    else{btn.disabled=false;show("Could not verify. Contact support with ref: "+ref,"crimson");}' +
'  })' +
'  .catch(function(){btn.disabled=false;show("Network error. Contact support with ref: "+ref,"orange");});' +
'}' +
'function showSuccess(amount,ref,label,email){' +
'  document.getElementById("payment-screen").style.display="none";' +
'  document.getElementById("success-screen").style.display="block";' +
'  document.getElementById("s-sub").innerHTML="&#8358;"+Number(amount).toLocaleString()+" received for <strong>"+label+"</strong>.<br/>Use the email below when creating your account.";' +
'  document.getElementById("s-email-val").textContent=email;' +
'  document.getElementById("s-ref").textContent=ref;' +
'  var goUrl=BASE+"/go?email="+encodeURIComponent(email)+"&plan="+encodeURIComponent(label)+"&ref="+encodeURIComponent(ref);' +
'  document.getElementById("s-btn").href=goUrl;' +
'  var secs=5;' +
'  var t=setInterval(function(){' +
'    secs--;' +
'    document.getElementById("s-secs").textContent=secs;' +
'    if(secs<=0){' +
'      clearInterval(t);' +
'      try{window.top.location.href=goUrl;}catch(e){window.location.href=goUrl;}' +
'    }' +
'  },1000);' +
'}' +
'function doCopy(){' +
'  var txt=document.getElementById("s-email-val").textContent;' +
'  if(navigator.clipboard){navigator.clipboard.writeText(txt);}' +
'  else{var el=document.createElement("textarea");el.value=txt;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);}' +
'  var b=document.getElementById("copy-btn");b.textContent="Copied!";setTimeout(function(){b.textContent="Copy";},2000);' +
'}' +
'function show(txt,color){msgEl.textContent=txt;msgEl.style.color=color||"#333";}' +
'})();' +
'</script></body></html>';

  res.send(html);
});

/* =========================================================
   GO PAGE — full page shown after payment, before BD signup
   ========================================================= */
app.get("/go", function(req, res) {
  var email = req.query.email || "";
  var plan  = req.query.plan  || "Membership Plan";
  var ref   = req.query.ref   || "";
  var dest  = BD_SIGNUP_URL;

  res.setHeader("Content-Type", "text/html");

  var html = '<!DOCTYPE html>' +
'<html lang="en"><head>' +
'<meta charset="UTF-8"/>' +
'<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
'<title>Create Your Account</title>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:Arial,sans-serif;background:#f0f4f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}' +
'.card{background:#fff;border-radius:16px;padding:40px 32px;max-width:500px;width:100%;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,.10)}' +
'.tick{font-size:60px;margin-bottom:14px}' +
'h2{font-size:23px;font-weight:bold;color:#1a6b3c;margin-bottom:8px}' +
'.pill{display:inline-block;background:#e6f4ea;color:#1a6b3c;font-size:13px;font-weight:bold;padding:5px 16px;border-radius:20px;margin-bottom:18px}' +
'.intro{font-size:14px;color:#555;line-height:1.7;margin-bottom:20px}' +
'.email-box{background:#f0fff4;border:2px solid #1a6b3c;border-radius:10px;padding:14px 16px;margin-bottom:18px;text-align:left}' +
'.email-lbl{font-size:12px;color:#555;margin-bottom:6px}' +
'.email-row{display:flex;align-items:center;gap:10px}' +
'.email-val{font-size:16px;font-weight:bold;color:#1a1a1a;flex:1;word-break:break-all}' +
'.copy-btn{background:#1a6b3c;color:#fff;border:none;border-radius:6px;padding:9px 14px;font-size:12px;font-weight:bold;cursor:pointer;flex-shrink:0}' +
'.note{background:#fff8e6;border-left:4px solid #f5a623;border-radius:0 8px 8px 0;padding:12px 14px;text-align:left;font-size:13px;color:#7a5800;margin-bottom:24px;line-height:1.6}' +
'.cta{display:block;background:#1a6b3c;color:#fff;padding:16px 24px;border-radius:10px;font-size:16px;font-weight:bold;text-decoration:none;margin-bottom:10px}' +
'.cta:hover{background:#0f4a28}' +
'.counter{font-size:13px;color:#888;margin-bottom:20px}' +
'.ref{background:#f5f5f5;border-radius:8px;padding:10px 14px;font-size:11px;color:#888;text-align:left}' +
'.ref code{font-family:monospace;color:#333;font-size:12px}' +
'</style></head><body>' +
'<div class="card">' +
'<div class="tick">&#9989;</div>' +
'<h2>Payment Confirmed!</h2>' +
'<div class="pill">' + plan + '</div>' +
'<p class="intro">Your payment was received successfully.<br/>Use the email below when creating your account.</p>' +
'<div class="email-box">' +
'<div class="email-lbl">Enter this email on the next page:</div>' +
'<div class="email-row">' +
'<div class="email-val" id="em">' + email + '</div>' +
'<button class="copy-btn" id="cbtn" onclick="doCopy()">Copy</button>' +
'</div></div>' +
'<div class="note">&#9888; <strong>Important:</strong> Use <strong>' + email + '</strong> when signing up so we can activate your <strong>' + plan + '</strong> access within 1 hour.</div>' +
'<a id="cta" href="' + dest + '" class="cta">Create My Free Account &rarr;</a>' +
'<div class="counter">Redirecting in <strong id="s">5</strong> seconds...</div>' +
(ref ? '<div class="ref">Payment reference: <code>' + ref + '</code></div>' : '') +
'</div>' +
'<script>' +
'function doCopy(){var t=document.getElementById("em").textContent;if(navigator.clipboard){navigator.clipboard.writeText(t);}else{var e=document.createElement("textarea");e.value=t;document.body.appendChild(e);e.select();document.execCommand("copy");document.body.removeChild(e);}var b=document.getElementById("cbtn");b.textContent="Copied!";setTimeout(function(){b.textContent="Copy";},2000);}' +
'var s=5,d=' + JSON.stringify(dest) + ';' +
'var t=setInterval(function(){s--;document.getElementById("s").textContent=s;if(s<=0){clearInterval(t);window.location.href=d;}},1000);' +
'</script>' +
'</body></html>';

  res.send(html);
});

/* =========================================================
   WEBHOOK — Paystack payment events
   ========================================================= */
app.post("/webhook/paystack", function(req, res) {
  var hash = crypto.createHmac("sha512", SECRET).update(req.body).digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) return res.status(401).send("Unauthorized");

  var event = JSON.parse(req.body);
  console.log("Webhook:", event.event, "|", event.data && event.data.reference);

  if (event.event === "charge.success") {
    var d       = event.data;
    var amtNGN  = d.amount / 100;
    var email   = d.customer.email;
    var name    = (d.metadata && d.metadata.name)    || "Member";
    var plan    = (d.metadata && d.metadata.plan)    || "Membership";
    var billing = (d.metadata && d.metadata.billing) || "monthly";
    var ref     = d.reference;

    console.log("PAID | " + name + " | " + email + " | " + plan + " | NGN " + amtNGN);

    var mailer = buildMailer();
    if (mailer) {
      mailer.sendMail({
        from: '"PropertyConnect.ng" <' + process.env.YOUR_EMAIL + '>',
        to: email,
        subject: "Payment Confirmed - " + plan,
        html: receiptHTML(name, plan, billing, amtNGN, ref)
      }).catch(function(e) { console.log("Customer email error:", e.message); });

      mailer.sendMail({
        from: '"Payment Alert" <' + process.env.YOUR_EMAIL + '>',
        to: process.env.YOUR_EMAIL,
        subject: "NEW PAYMENT NGN" + amtNGN + " - " + name,
        html: adminHTML(name, email, plan, billing, amtNGN, ref)
      }).catch(function(e) { console.log("Admin email error:", e.message); });
    }
  }

  res.sendStatus(200);
});

/* =========================================================
   VERIFY — called from payment page after Paystack popup
   ========================================================= */
app.get("/verify/:ref", function(req, res) {
  fetch("https://api.paystack.co/transaction/verify/" + req.params.ref, {
    headers: { Authorization: "Bearer " + SECRET }
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.data && result.data.status === "success") {
      res.json({
        success:   true,
        amount:    result.data.amount / 100,
        reference: result.data.reference,
        email:     result.data.customer.email
      });
    } else {
      res.json({ success: false });
    }
  })
  .catch(function(e) { res.status(500).json({ success: false, error: e.message }); });
});

/* =========================================================
   HEALTH CHECK
   ========================================================= */
app.get("/", function(req, res) { res.send("PropertyConnect Paystack Server OK"); });

/* =========================================================
   EMAIL TEMPLATES
   ========================================================= */
function buildMailer() {
  if (!process.env.YOUR_EMAIL || !process.env.YOUR_EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.YOUR_EMAIL, pass: process.env.YOUR_EMAIL_PASSWORD }
  });
}

function receiptHTML(name, plan, billing, amount, ref) {
  return "<div style='font-family:Arial;max-width:600px;margin:auto;padding:24px'>" +
    "<div style='background:#1a6b3c;padding:20px;border-radius:8px 8px 0 0;text-align:center'>" +
    "<h2 style='color:#fff;margin:0'>Payment Confirmed</h2></div>" +
    "<div style='border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;padding:24px'>" +
    "<p>Hello <strong>" + name + "</strong>,</p>" +
    "<p style='margin:12px 0'>Your payment for <strong>" + plan + "</strong> is confirmed. " +
    "You should have been redirected to create your account. " +
    "If not, visit: <a href='" + BD_SIGNUP_URL + "' style='color:#1a6b3c'>" + BD_SIGNUP_URL + "</a></p>" +
    "<table style='border-collapse:collapse;width:100%;margin:18px 0'>" +
    "<tr style='background:#f5f5f5'><td style='padding:10px;border:1px solid #ddd;width:40%'><b>Plan</b></td><td style='padding:10px;border:1px solid #ddd'>" + plan + "</td></tr>" +
    "<tr><td style='padding:10px;border:1px solid #ddd'><b>Billing</b></td><td style='padding:10px;border:1px solid #ddd'>" + billing + "</td></tr>" +
    "<tr style='background:#f5f5f5'><td style='padding:10px;border:1px solid #ddd'><b>Amount</b></td><td style='padding:10px;border:1px solid #ddd;color:#1a6b3c;font-weight:bold'>NGN " + amount.toLocaleString() + "</td></tr>" +
    "<tr><td style='padding:10px;border:1px solid #ddd'><b>Reference</b></td><td style='padding:10px;border:1px solid #ddd;font-family:monospace'>" + ref + "</td></tr>" +
    "</table>" +
    "<p style='color:#555;font-size:13px'>Your paid plan will be activated within 1 hour of creating your account.</p>" +
    "<p style='color:#888;font-size:12px;margin-top:20px'>PropertyConnect.ng Team</p>" +
    "</div></div>";
}

function adminHTML(name, email, plan, billing, amount, ref) {
  return "<div style='font-family:Arial;padding:20px'>" +
    "<h3 style='color:#1a6b3c;margin-top:0'>New Payment Received</h3>" +
    "<table style='border-collapse:collapse;width:100%;max-width:520px'>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5;width:35%'><b>Name</b></td><td style='padding:9px 12px;border:1px solid #ddd'>" + name + "</td></tr>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5'><b>Email</b></td><td style='padding:9px 12px;border:1px solid #ddd'>" + email + "</td></tr>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5'><b>Plan</b></td><td style='padding:9px 12px;border:1px solid #ddd'>" + plan + "</td></tr>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5'><b>Billing</b></td><td style='padding:9px 12px;border:1px solid #ddd'>" + billing + "</td></tr>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5'><b>Amount</b></td><td style='padding:9px 12px;border:1px solid #ddd;font-weight:bold;color:#1a6b3c'>NGN " + amount.toLocaleString() + "</td></tr>" +
    "<tr><td style='padding:9px 12px;border:1px solid #ddd;background:#f5f5f5'><b>Reference</b></td><td style='padding:9px 12px;border:1px solid #ddd;font-family:monospace'>" + ref + "</td></tr>" +
    "</table>" +
    "<div style='margin-top:18px'><a href='https://www.propertyconnect.ng/admin/members' style='background:#1a6b3c;color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:bold'>Open BD Members Admin</a></div>" +
    "<p style='color:#888;font-size:12px;margin-top:14px'>Find this member by email and upgrade their plan from Basic to " + plan + ".</p>" +
    "</div>";
}

app.listen(process.env.PORT || 3000, function() {
  console.log("Server running on port " + (process.env.PORT || 3000));
});
