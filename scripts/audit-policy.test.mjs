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
