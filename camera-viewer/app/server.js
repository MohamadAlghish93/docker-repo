// server.js
import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, rmSync, readdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3040);
const HLS_PATH = process.env.HLS_PATH || "/tmp/hls";
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;
const RTSP_URL = process.env.CAMERA_RTSP_URL;

if (!AUTH_USER || !AUTH_PASS) {
  throw new Error("AUTH_USER and AUTH_PASS must be set in environment");
}
if (!RTSP_URL) {
  throw new Error("CAMERA_RTSP_URL must be set in environment");
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

app.use(basicAuth);
app.use(express.json());

// Serve static files
app.use(express.static(join(__dirname, "public")));
app.use("/hls", express.static(HLS_PATH));

// FFmpeg state
let ffmpegProc = null;

function cleanHlsDir() {
  try {
    const files = readdirSync(HLS_PATH);
    for (const f of files) {
      if (
        f.startsWith("stream") &&
        (f.endsWith(".ts") || f.endsWith(".m3u8") || f.endsWith(".tmp"))
      ) {
        rmSync(join(HLS_PATH, f), { force: true });
      }
    }
  } catch (e) {
    console.warn("Failed to clean HLS dir:", e);
  }
}

function startFFmpeg() {
  if (ffmpegProc) {
    return { ok: false, error: "FFmpeg already running" };
  }

  cleanHlsDir();
  console.log("Starting FFmpeg for", RTSP_URL);

  const args = [
    "-loglevel", "warning",

    // Input options
    "-rtsp_transport", "tcp",
    "-probesize", "1000000",
    "-analyzeduration", "1000000",
    "-max_delay", "500000",
    "-i", RTSP_URL,

    // Video
    "-c:v", "h264",
    "-preset", "fast",
    "-tune", "zerolatency",
    "-g", "50",
    "-sc_threshold", "0",

    // Audio
    "-c:a", "aac",
    "-b:a", "128k",

    // HLS output
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "5",
    "-hls_flags", "delete_segments+program_date_time+independent_segments",
    "-hls_start_number_source", "epoch",
    "-hls_segment_filename", join(HLS_PATH, "stream%d.ts"),
    join(HLS_PATH, "stream.m3u8"),
  ];

  ffmpegProc = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  ffmpegProc.stderr.on("data", (data) => {
    const line = data.toString();
    if (line.includes("error") || line.includes("missed") || line.includes("corrupt")) {
      console.log("FFmpeg:", line.trim());
    }
  });

  ffmpegProc.on("exit", (code, signal) => {
    console.log(`FFmpeg exited (code=${code}, signal=${signal})`);
    ffmpegProc = null;
  });

  return { ok: true };
}

function stopFFmpeg() {
  if (!ffmpegProc) {
    return { ok: false, error: "FFmpeg not running" };
  }

  console.log("Stopping FFmpeg (user requested)");
  ffmpegProc.kill("SIGTERM");
  ffmpegProc = null;

  // Delete all streaming files
  cleanHlsDir();

  return { ok: true };
}

// API: start stream
app.post("/api/start", (req, res) => {
  const result = startFFmpeg();
  if (result.ok) {
    res.json({ ok: true, message: "Stream started" });
  } else {
    res.status(400).json({ ok: false, error: result.error });
  }
});

// API: stop stream
app.post("/api/stop", (req, res) => {
  const result = stopFFmpeg();
  if (result.ok) {
    res.json({ ok: true, message: "Stream stopped" });
  } else {
    res.status(400).json({ ok: false, error: result.error });
  }
});

// API: status
app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    running: !!ffmpegProc,
  });
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Camera viewer listening on port ${PORT}`);
  console.log(`HLS path: ${HLS_PATH}`);
  console.log(`Auth enabled for user: ${AUTH_USER}`);
  console.log(`RTSP URL New: ${RTSP_URL ? "set" : "NOT SET"}`);
});
