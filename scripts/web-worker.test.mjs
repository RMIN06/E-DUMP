import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../web/worker.mjs";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = { ASSETS: { fetch: async () => new Response("shell") } };
function request(path, options = {}) {
  return new Request("https://edump-preview.pages.dev" + path, options);
}
test("cross-origin writes are rejected before API access", async () => {
  globalThis.fetch = () => { throw new Error("must not forward"); };
  assert.equal((await worker.fetch(request("/api/v1/auth/login", { method: "POST", headers: { Origin: "https://evil.test" }, body: "{}" }), env)).status, 403);
});
test("login holds refresh token in HttpOnly cookie and strips it from JSON", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("Cookie"), null);
    return Response.json({ access_token: "access", refresh_token: "private-refresh", user: { id: "id" } });
  };
  const response = await worker.fetch(request("/api/v1/auth/login", { method: "POST", headers: { Origin: "https://edump-preview.pages.dev", Cookie: "other=secret" }, body: "{}" }), env);
  assert.equal((await response.json()).refresh_token, "browser-cookie");
  assert.match(response.headers.get("Set-Cookie"), /Secure; HttpOnly; SameSite=Strict/);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});
test("refresh uses only its private cookie and logout clears it", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { refresh_token: "real-cookie" });
    return new Response(null, { status: 204 });
  };
  const response = await worker.fetch(request("/api/v1/auth/logout", { method: "POST", headers: { Origin: "https://edump-preview.pages.dev", Cookie: "__Host-edump-refresh=real-cookie", Authorization: "Bearer access" }, body: '{"refresh_token":"forged"}' }), env);
  assert.equal(response.status, 204);
  assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
});
test("unauthenticated refresh and arbitrary download hosts fail closed", async () => {
  globalThis.fetch = () => { throw new Error("must not forward"); };
  assert.equal((await worker.fetch(request("/api/v1/auth/refresh", { method: "POST", headers: { Origin: "https://edump-preview.pages.dev" } }), env)).status, 401);
  for (const target of ["https://localhost/file", "https://fcm.googleapis.com/file", "http://c3306ffca33ee93f5416154e4cc37bca.r2.cloudflarestorage.com/edump-files/file"]) {
    assert.equal((await worker.fetch(request("/api/download?url=" + encodeURIComponent(target)), env)).status, 403);
  }
});
test("download verifies active session before retrieving signed private object", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return calls === 1 ? new Response("", { status: 403 }) : new Response("file"); };
  const response = await worker.fetch(request("/api/download?url=" + encodeURIComponent("https://c3306ffca33ee93f5416154e4cc37bca.r2.cloudflarestorage.com/edump-files/file?signature=test"), { headers: { Authorization: "Bearer test" } }), env);
  assert.equal(response.status, 403); assert.equal(calls, 1);
});
test("normal API calls retain authorization and static screens use assets", async () => {
  globalThis.fetch = async (url, options) => { assert.equal(url, "https://edump-api.onrender.com/api/v1/subjects"); assert.equal(options.headers.get("Authorization"), "Bearer test"); return Response.json([]); };
  assert.equal((await worker.fetch(request("/api/v1/subjects", { headers: { Authorization: "Bearer test" } }), env)).status, 200);
  assert.equal(await (await worker.fetch(request("/subjects"), env)).text(), "shell");
});

test("upstream redirects and connection failures return a safe unavailable response", async () => {
  for (const failure of ["redirect", "network"]) {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.redirect, "manual");
      if (failure === "network") throw new Error("private connection details");
      return new Response(null, { status: 302, headers: { Location: "https://unexpected.invalid" } });
    };
    const response = await worker.fetch(request("/api/v1/subjects"), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "unavailable");
  }
});
