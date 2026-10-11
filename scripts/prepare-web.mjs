import { readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { webViewport, webReset } from "../mobile/src/theme/web.ts";
const output = resolve(import.meta.dirname, "../mobile/dist");
const html = await readFile(resolve(output, "index.html"), "utf8");
await writeFile(resolve(output, "index.html"), html.replace(/<meta name="viewport"[^>]*>/, `<meta name="viewport" content="${webViewport}" />`).replace("</head>", `<style id="edump-web-reset">${webReset}</style><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon.png"><meta name="apple-mobile-web-app-capable" content="yes"></head>`));
await copyFile(resolve(import.meta.dirname, "../web/worker.mjs"), resolve(output, "_worker.js"));
await writeFile(resolve(output, "_headers"), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/sw.js
  Cache-Control: no-cache
/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable
`);
console.log("Prepared the web preview and same-origin API proxy.");
