const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Keep server internals out of the public static tree (dotfiles like .git
// and .claude are already excluded by express.static's default behavior).
const BLOCKED = new Set(["server.js", "package.json", "package-lock.json", "node_modules"]);
app.use((req, res, next) => {
  const firstSegment = req.path.replace(/^\/+/, "").split("/")[0];
  if (BLOCKED.has(firstSegment)) return res.status(404).end();
  next();
});

app.use(express.json());

// --- Enquiry form submission -> sends the email via Resend's HTTP API ----
// GoDaddy shared hosting blocks outbound SMTP, so email is sent over HTTPS
// instead. Requires these environment variables on the host (set them in
// the GoDaddy Node.js hosting control panel - never commit them):
//   RESEND_API_KEY
// Optional: RESEND_FROM (must be a verified sender/domain in Resend), CONTACT_TO
const CONTACT_TO = process.env.CONTACT_TO || "letsmoveabroad@hotmail.com";
const RESEND_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

async function sendViaResend({ subject, text, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [CONTACT_TO],
      reply_to: replyTo || undefined,
      subject: subject,
      text: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("Resend API error " + res.status + ": " + body);
  }
}

app.post("/api/enquiry", async (req, res) => {
  var clean = function (v) {
    return typeof v === "string" ? v.trim().slice(0, 2000) : "";
  };
  var body = req.body || {};
  var name = clean(body.name) || "Website visitor";
  var email = clean(body.email);
  var phone = clean(body.phone);
  var destination = clean(body.destination);
  var pkg = clean(body.package);
  var dates = clean(body.dates);
  var travellers = clean(body.travellers);
  var message = clean(body.message);
  var subject = clean(body.subject) || "Website Enquiry - " + name;

  if (!email && !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields." });
  }

  var lines = ["Name: " + name];
  if (email) lines.push("Email: " + email);
  if (phone) lines.push("Phone: " + phone);
  if (destination) lines.push("Destination: " + destination);
  if (pkg) lines.push("Package: " + pkg);
  if (dates) lines.push("Travel dates: " + dates);
  if (travellers) lines.push("Travellers: " + travellers);
  if (message) lines.push("", "Message:", message);

  if (!process.env.RESEND_API_KEY) {
    console.error("Enquiry not emailed: RESEND_API_KEY is not set.");
    return res.status(500).json({ ok: false, error: "Email is not configured on the server yet." });
  }

  try {
    await sendViaResend({
      subject: subject,
      text: lines.join("\n"),
      replyTo: email || undefined,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Enquiry email failed:", err);
    res.status(500).json({ ok: false, error: "Something went wrong sending your enquiry." });
  }
});

app.use(express.static(ROOT, { extensions: ["html"], index: "index.html" }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
