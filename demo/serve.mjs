// Minimal static file server for manual viewing (no dependencies).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4599;
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
};

export function createServer() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(__dirname, p);
    if (!fp.startsWith(__dirname)) { res.writeHead(403); return res.end("403"); }
    fs.readFile(fp, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
      res.end(buf);
    });
  });
}

// Run directly: `node serve.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, () => console.log(`Demo running at http://localhost:${PORT}`));
}
