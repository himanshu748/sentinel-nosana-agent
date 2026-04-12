import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Socket } from "node:net";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.FRONTEND_PORT || 5173;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const backendUrl = new URL(BACKEND_URL);

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function proxyHttp(req, res) {
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
}

const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/socket.io/")) {
    proxyHttp(req, res);
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

server.on("upgrade", (req, socket, head) => {
  if (!req.url.startsWith("/socket.io/")) {
    socket.destroy();
    return;
  }

  const target = new Socket();
  target.connect(Number(backendUrl.port) || 3000, backendUrl.hostname || "localhost", () => {
    const reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    target.write(reqLine + headers + "\r\n\r\n");
    if (head && head.length) target.write(head);
    target.pipe(socket);
    socket.pipe(target);
  });

  target.on("error", () => socket.destroy());
  socket.on("error", () => target.destroy());
});

server.listen(PORT, () => {
  console.log(`Sentinel Frontend: http://localhost:${PORT}`);
  console.log(`Backend proxy: ${BACKEND_URL}`);
});
