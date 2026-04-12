import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.FRONTEND_PORT || 5173;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/socket.io/")) {
    const url = new URL(req.url, BACKEND_URL);
    const doRequest = url.protocol === "https:" ? httpsRequest : httpRequest;
    const proxyReq = doRequest(
      url,
      { method: req.method, headers: { ...req.headers, host: url.host } },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    req.pipe(proxyReq);
    proxyReq.on("error", () => {
      res.writeHead(502);
      res.end("Backend unavailable");
    });
    return;
  }

  let filePath = join(__dirname, req.url === "/" ? "index.html" : req.url);
  if (!existsSync(filePath)) {
    filePath = join(__dirname, "index.html");
  }

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Sentinel Frontend: http://localhost:${PORT}`);
  console.log(`Backend proxy: ${BACKEND_URL}`);
});
