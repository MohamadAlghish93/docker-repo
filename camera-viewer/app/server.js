// server.js
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3040;
const HLS_PATH = process.env.HLS_PATH || "/tmp/hls";

// Auth credentials from env (no dotenv)
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

console.log("AUTH_USER:", AUTH_USER ? "set" : "NOT SET");
console.log("AUTH_PASS:", AUTH_PASS ? "set" : "NOT SET");

if (!AUTH_USER || !AUTH_PASS) {
  throw new Error("AUTH_USER and AUTH_PASS must be set in environment");
}

// Basic auth middleware
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Camera Viewer"');
    return res.status(401).send("Unauthorized");
  }

  const [scheme, credentials] = authHeader.split(" ");
  if (scheme !== "Basic" || !credentials) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Camera Viewer"');
    return res.status(401).send("Unauthorized");
  }

  const decoded = Buffer.from(credentials, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");

  if (user === AUTH_USER && pass === AUTH_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Camera Viewer"');
  return res.status(401).send("Unauthorized");
}

// Public static files (if you want some assets public, keep this; otherwise remove)
// app.use(express.static(join(__dirname, "public")));

// Protect everything under "/" with auth
app.use(basicAuth);

// Now serve static files from "public"
app.use(express.static(join(__dirname, "public")));

// HLS path
app.use("/hls", express.static(HLS_PATH));

// Root route (optional, since static already serves index.html)
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Camera viewer listening on port ${PORT}`);
  console.log(`HLS path: ${HLS_PATH}`);
  console.log(`Auth enabled for user: ${AUTH_USER}`);
});
