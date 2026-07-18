const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");

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

// --- Enquiry form submission -> sends the email server-side --------------
// Requires SMTP credentials as environment variables on the host (set these
// in the GoDaddy Node.js hosting control panel - never commit them):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Optional: SMTP_SECURE ("true" for port 465), SMTP_FROM, CONTACT_TO
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const CONTACT_TO = process.env.CONTACT_TO || "letsmoveabroad@hotmail.com";

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

  var mailer = getTransporter();
  if (!mailer) {
    console.error("Enquiry not emailed: SMTP_HOST/SMTP_USER/SMTP_PASS are not set.");
    return res.status(500).json({ ok: false, error: "Email is not configured on the server yet." });
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: CONTACT_TO,
      replyTo: email || undefined,
      subject: subject,
      text: lines.join("\n"),
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
