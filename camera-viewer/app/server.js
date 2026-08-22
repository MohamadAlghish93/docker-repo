import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3040;
const HLS_PATH = process.env.HLS_PATH || "/tmp/hls";

app.use(express.static(join(__dirname, "public")));
app.use("/hls", express.static(HLS_PATH));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Camera viewer listening on port ${PORT}`);
  console.log(`HLS path: ${HLS_PATH}`);
});
