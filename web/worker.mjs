const API = "https://edump-api.onrender.com";
const R2_HOST = "c3306ffca33ee93f5416154e4cc37bca.r2.cloudflarestorage.com";
const COOKIE = "__Host-edump-refresh";
const authPaths = new Set(["/api/v1/auth/login", "/api/v1/auth/verify", "/api/v1/auth/refresh", "/api/v1/auth/logout"]);
function refreshCookie(request) {
  return (request.headers.get("Cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
}
function cookie(value = "") {
  return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${value ? 2592000 : 0}`;
}
function refuse(status = 403) { return Response.json({ error: { code: "unauthorized", message: "Sign in again." } }, { status }); }
async function upstreamFetch(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) throw new Error("Unexpected upstream redirect.");
    return response;
  } catch {
    return Response.json({ error: { code: "unavailable", message: "Can't reach the server. Try again." } }, { status: 503 });
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/download") {
      let target;
      try { target = new URL(url.searchParams.get("url") ?? "https://invalid.invalid"); } catch { return refuse(); }
      if (target.protocol !== "https:" || target.hostname !== R2_HOST || target.port || target.username || target.password || !target.pathname.startsWith("/edump-files/")) return refuse();
      const token = request.headers.get("Authorization"); if (!token) return refuse(401);
      const profile = await upstreamFetch(API + "/api/v1/me", { headers: { Authorization: token } });
      if (!profile.ok) return refuse(profile.status === 403 ? 403 : 401);
      const download = await upstreamFetch(target);
      return new Response(download.body, { status: download.status, headers: { "Content-Type": download.headers.get("Content-Type") ?? "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    if (url.pathname.startsWith("/api/v1/")) {
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return refuse();
      if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) return refuse();
      const headers = new Headers();
      for (const name of ["Content-Type", "Authorization", "Accept"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
      let body = request.method === "GET" ? undefined : request.body;
      if (["/api/v1/auth/refresh", "/api/v1/auth/logout"].includes(url.pathname)) {
        const refresh = refreshCookie(request); if (!refresh) return refuse(401);
        body = JSON.stringify({ refresh_token: refresh }); headers.set("Content-Type", "application/json");
      }
      const upstream = await upstreamFetch(API + url.pathname + url.search, { method: request.method, headers, body });
      const outgoing = new Headers({ "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      if (authPaths.has(url.pathname)) {
        if (url.pathname.endsWith("/logout")) outgoing.set("Set-Cookie", cookie());
        if (upstream.ok && upstream.status !== 204) {
          const data = await upstream.json();
          if (data.refresh_token) { outgoing.set("Set-Cookie", cookie(data.refresh_token)); data.refresh_token = "browser-cookie"; }
          return new Response(JSON.stringify(data), { status: upstream.status, headers: outgoing });
        }
        if (url.pathname.endsWith("/refresh") && [401, 403].includes(upstream.status)) outgoing.set("Set-Cookie", cookie());
      }
      return new Response(upstream.body, { status: upstream.status, headers: outgoing });
    }
    return env.ASSETS.fetch(request);
  },
};
