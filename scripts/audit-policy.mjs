import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const exceptions = {
  "GHSA-vfj7-8cjw-p6xm": { name: "braces", version: "3.0.3" },
  "GHSA-86w9-cpqp-85rv": { name: "node-forge", version: "1.4.0" },
  "GHSA-hp3w-g68c-fv3c": { name: "sprintf-js", version: "1.0.3" },
};
const expires = Date.parse("2026-11-09T00:00:00Z");

export function evaluateAudit(audit, lock, now = Date.now()) {
  if (audit.error || audit.auditReportVersion !== 2 || !audit.vulnerabilities) {
    throw new Error(
      "Dependency audit failed or returned an unsupported report.",
    );
  }
  const accepted = new Set();
  for (const [name, finding] of Object.entries(audit.vulnerabilities)) {
    const visited = new Set();
    const queue = [name];
    let advisoryCount = 0;
    while (queue.length) {
      const current = queue.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      const dependency = audit.vulnerabilities[current];
      if (!dependency || !Array.isArray(dependency.via)) {
        throw new Error(`Unresolved audit finding: ${current}`);
      }
      for (const via of dependency.via) {
        if (typeof via === "string") {
          queue.push(via);
          continue;
        }
        advisoryCount += 1;
        const id = via.url?.split("/").pop();
        const exception = exceptions[id];
        if (!exception || exception.name !== via.name || now >= expires) {
          throw new Error(`Unaccepted or expired advisory: ${id ?? current}`);
        }
        if (!dependency.nodes?.length) {
          throw new Error(`Missing package locations: ${current}`);
        }
        for (const node of dependency.nodes) {
          if (lock.packages?.[node]?.version !== exception.version) {
            throw new Error(`Exception version mismatch: ${node}`);
          }
        }
        accepted.add(id);
      }
    }
    if (!advisoryCount || !finding.via?.length) {
      throw new Error(`Finding has no resolved advisory: ${name}`);
    }
  }
  return [...accepted].sort();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const mobile = resolve(import.meta.dirname, "../mobile");
    const result = spawnSync("npm audit --omit=dev --json", {
      cwd: mobile,
      encoding: "utf8",
      shell: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.error || ![0, 1].includes(result.status)) {
      throw new Error("npm audit did not complete successfully.");
    }
    const accepted = evaluateAudit(
      JSON.parse(result.stdout),
      JSON.parse(readFileSync(resolve(mobile, "package-lock.json"), "utf8")),
    );
    console.log("Dependency audit: no unaccepted findings.");
    for (const id of accepted) {
      console.log(`Owner-approved tooling exception through 2026-11-08: ${id}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
