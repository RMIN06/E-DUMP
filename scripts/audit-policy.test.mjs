import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAudit } from "./audit-policy.mjs";

const now = Date.parse("2026-10-09T00:00:00Z");
function fixture() {
  return {
    audit: {
      auditReportVersion: 2,
      vulnerabilities: {
        deepmerge: {
          nodes: ["node_modules/deepmerge"],
          via: [
            {
              name: "deepmerge",
              url: "https://github.com/advisories/GHSA-gcqx-w48m-w2h4",
            },
          ],
        },
        "jest-config": { via: ["deepmerge"], nodes: ["node_modules/jest-config"] },
      },
    },
    lock: { packages: { "node_modules/deepmerge": { version: "4.3.1" } } },
  };
}

test("accepts approved advisory and its dependent findings", () => {
  const { audit, lock } = fixture();
  assert.deepEqual(evaluateAudit(audit, lock, now), ["GHSA-gcqx-w48m-w2h4"]);
});
test("rejects newly reported advisory", () => {
  const { audit, lock } = fixture();
  audit.vulnerabilities.deepmerge.via.push({
    name: "deepmerge",
    url: "https://github.com/advisories/GHSA-new",
  });
  assert.throws(() => evaluateAudit(audit, lock, now), /Unaccepted/);
});
test("rejects changed package version", () => {
  const { audit, lock } = fixture();
  lock.packages["node_modules/deepmerge"].version = "4.3.2";
  assert.throws(() => evaluateAudit(audit, lock, now), /version mismatch/);
});
test("rejects expired exception", () => {
  const { audit, lock } = fixture();
  assert.throws(
    () => evaluateAudit(audit, lock, Date.parse("2026-12-09T00:00:00Z")),
    /expired/,
  );
});
test("rejects failed or malformed audit", () => {
  assert.throws(() => evaluateAudit({ error: {} }, {}, now), /audit failed/);
});
test("rejects unresolved dependent findings", () => {
  const { audit, lock } = fixture();
  audit.vulnerabilities["jest-config"].via = ["missing"];
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
  assert.throws(() => evaluateAudit(audit, lock, Date.parse("2026-12-09T00:00:00Z")), /expired/);
});
test("accepts any listed version of a multi-version exception", () => {
  const audit = {
    auditReportVersion: 2,
    vulnerabilities: {
      glob: {
        nodes: ["node_modules/glob", "node_modules/jest-runner/node_modules/glob"],
        via: [{ name: "glob", url: "https://github.com/advisories/GHSA-3g3m-2fjr-6pw4" }],
      },
    },
  };
  const lock = {
    packages: {
      "node_modules/glob": { version: "13.0.6" },
      "node_modules/jest-runner/node_modules/glob": { version: "10.5.0" },
    },
  };
  assert.deepEqual(evaluateAudit(audit, lock, now), ["GHSA-3g3m-2fjr-6pw4"]);
  lock.packages["node_modules/glob"].version = "13.0.7";
  assert.throws(() => evaluateAudit(audit, lock, now), /version mismatch/);
});
