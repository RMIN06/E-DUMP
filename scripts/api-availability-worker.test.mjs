import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "./api-availability-worker.mjs";

test("scheduled check uses Workers-compatible redirects and validates real readiness", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://edump-api.onrender.com/readyz");
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ status: "ok" });
  });
  await worker.scheduled();
});

test("scheduled check rejects redirects, unavailable databases and gateway HTML", async (t) => {
  for (const response of [
    new Response(null, { status: 302, headers: { Location: "https://example.invalid" } }),
    Response.json({ status: "unavailable" }),
    Response.json({ error: "unavailable" }, { status: 503 }),
    new Response("<html>Gateway unavailable</html>"),
  ]) {
    t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(worker.scheduled());
    t.mock.restoreAll();
  }
});
