const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

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

// --- Database ---------------------------------------------------------
// Enquiries are saved to a MySQL "enquiries" table (created automatically
// on first use) instead of being emailed. Requires these environment
// variables on the host (set them in the GoDaddy Node.js hosting control
// panel - never commit them):
//   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
// The admin page at /admin also requires ADMIN_PASSWORD.
let pool = null;
function getPool() {
  if (pool) return pool;
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) return null;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });
  return pool;
}

async function ensureEnquiriesTable(db) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS enquiries (" +
      "id INT AUTO_INCREMENT PRIMARY KEY, " +
      "name VARCHAR(255), " +
      "email VARCHAR(255), " +
      "phone VARCHAR(100), " +
      "destination VARCHAR(255), " +
      "`package` VARCHAR(255), " +
      "dates VARCHAR(255), " +
      "travellers VARCHAR(100), " +
      "message TEXT, " +
      "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ")"
  );
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

  if (!email && !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields." });
  }

  var db = getPool();
  if (!db) {
    console.error("Enquiry not saved: DB_HOST/DB_USER/DB_NAME are not set.");
    return res.status(500).json({ ok: false, error: "Database is not configured on the server yet." });
  }

  try {
    await ensureEnquiriesTable(db);
    await db.query(
      "INSERT INTO enquiries (name, email, phone, destination, `package`, dates, travellers, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, email, phone, destination, pkg, dates, travellers, message]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Enquiry save failed:", err);
    res.status(500).json({ ok: false, error: "Something went wrong submitting your enquiry." });
  }
});

// --- Admin: view submitted enquiries -----------------------------------
// Requires ADMIN_PASSWORD as an environment variable. Protected with HTTP
// Basic Auth (any username, password must match ADMIN_PASSWORD).
function requireAdmin(req, res, next) {
  var adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).send("Admin page is not configured on the server yet.");
  }
  var header = req.headers.authorization || "";
  var match = /^Basic\s+(.+)$/.exec(header);
  var ok = false;
  if (match) {
    var decoded = Buffer.from(match[1], "base64").toString("utf8");
    var idx = decoded.indexOf(":");
    var pass = idx === -1 ? decoded : decoded.slice(idx + 1);
    ok = pass === adminPassword;
  }
  if (!ok) {
    res.set("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Authentication required.");
  }
  next();
}

function escapeHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

app.get("/admin", requireAdmin, async (req, res) => {
  var db = getPool();
  if (!db) {
    return res.status(500).send("Database is not configured on the server yet.");
  }

  try {
    await ensureEnquiriesTable(db);
    var rows = (await db.query("SELECT * FROM enquiries ORDER BY created_at DESC"))[0];

    var tableRows = rows
      .map(function (r) {
        return (
          "<tr>" +
          "<td>" + escapeHtml(r.name) + "</td>" +
          "<td>" + escapeHtml(r.email) + "</td>" +
          "<td>" + escapeHtml(r.phone) + "</td>" +
          "<td>" + escapeHtml(r.destination) + "</td>" +
          "<td>" + escapeHtml(r.package) + "</td>" +
          "<td>" + escapeHtml(r.dates) + "</td>" +
          "<td>" + escapeHtml(r.travellers) + "</td>" +
          "<td>" + escapeHtml(r.message) + "</td>" +
          "<td>" + escapeHtml(r.created_at) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    res.set("Content-Type", "text/html").send(
      "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
        "<title>Enquiries</title>" +
        "<style>" +
        "body{font-family:sans-serif;margin:2rem;}" +
        "table{border-collapse:collapse;width:100%;}" +
        "th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top;font-size:14px;}" +
        "th{background:#f5f5f5;}" +
        "</style></head><body>" +
        "<h1>Enquiries (" + rows.length + ")</h1>" +
        "<table><thead><tr>" +
        "<th>Name</th><th>Email</th><th>Phone</th><th>Destination</th><th>Package</th>" +
        "<th>Dates</th><th>Travellers</th><th>Message</th><th>Submitted</th>" +
        "</tr></thead><tbody>" +
        tableRows +
        "</tbody></table></body></html>"
    );
  } catch (err) {
    console.error("Admin page failed:", err);
    res.status(500).send("Something went wrong loading enquiries.");
  }
});

app.use(express.static(ROOT, { extensions: ["html"], index: "index.html" }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
