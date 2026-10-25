import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAudit } from "./audit-policy.mjs";

const now = Date.parse("2026-10-09T00:00:00Z");
function fixture() {
  return {
    audit: {
      auditReportVersion: 2,
      vulnerabilities: {
        braces: {
          nodes: ["node_modules/braces"],
          via: [
            {
              name: "braces",
              url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
            },
          ],
        },
        micromatch: { via: ["braces"], nodes: ["node_modules/micromatch"] },
      },
    },
    lock: { packages: { "node_modules/braces": { version: "3.0.3" } } },
  };
}

test("accepts approved advisory and its dependent findings", () => {
  const { audit, lock } = fixture();
  assert.deepEqual(evaluateAudit(audit, lock, now), ["GHSA-vfj7-8cjw-p6xm"]);
});
test("rejects newly reported advisory", () => {
  const { audit, lock } = fixture();
  audit.vulnerabilities.braces.via.push({
    name: "braces",
    url: "https://github.com/advisories/GHSA-new",
  });
  assert.throws(() => evaluateAudit(audit, lock, now), /Unaccepted/);
});
test("rejects changed package version", () => {
  const { audit, lock } = fixture();
  lock.packages["node_modules/braces"].version = "3.0.4";
  assert.throws(() => evaluateAudit(audit, lock, now), /version mismatch/);
});
test("rejects expired exception", () => {
  const { audit, lock } = fixture();
  assert.throws(
    () => evaluateAudit(audit, lock, Date.parse("2026-11-09T00:00:00Z")),
    /expired/,
  );
});
test("rejects failed or malformed audit", () => {
  assert.throws(() => evaluateAudit({ error: {} }, {}, now), /audit failed/);
});
test("rejects unresolved dependent findings", () => {
  const { audit, lock } = fixture();
  audit.vulnerabilities.micromatch.via = ["missing"];
  assert.throws(() => evaluateAudit(audit, lock, now), /Unresolved/);
});


function cliZodFixture(node = "node_modules/expo/node_modules/zod", version = "3.25.76") {
  return {
    audit: { auditReportVersion: 2, vulnerabilities: { zod: { nodes: [node], via: [{ name: "zod", url: "https://github.com/advisories/GHSA-mrhx-c7xc-m3w5" }] } } },
    lock: { packages: { [node]: { version } } },
  };
}

test("accepts only the approved nested CLI Zod advisory", () => {
  const { audit, lock } = cliZodFixture();
  assert.deepEqual(evaluateAudit(audit, lock, now), ["GHSA-mrhx-c7xc-m3w5"]);
});

test("rejects Zod advisory in the app or any other installed location", () => {
  for (const node of ["node_modules/zod", "node_modules/another-tool/node_modules/zod"]) {
    const { audit, lock } = cliZodFixture(node);
    assert.throws(() => evaluateAudit(audit, lock, now), /path mismatch/);
  }
});

test("rejects changed CLI Zod version and expired acceptance", () => {
  const changed = cliZodFixture(undefined, "4.6.5");
  assert.throws(() => evaluateAudit(changed.audit, changed.lock, now), /version mismatch/);
  const { audit, lock } = cliZodFixture();
  assert.throws(() => evaluateAudit(audit, lock, Date.parse("2026-11-09T00:00:00Z")), /expired/);
});
