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

app.use(express.static(ROOT, { extensions: ["html"], index: "index.html" }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
