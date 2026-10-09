# M0 dependency audit decision — 9 October 2026

Status: owner approved on 9 October 2026. A scoped audit policy enforces this decision.

The npm production audit reports 40 affected package entries cascading from three
unpatched advisories. The registry's latest versions remain affected. Changing Expo
major versions does not supply fixes for these leaf packages.

| Package | Advisory | Installed dependency path | Exposure |
|---|---|---|---|
| braces 3.0.3 | GHSA-vfj7-8cjw-p6xm | Metro/Jest → micromatch → braces | Deeply nested patterns can exhaust the tooling process stack. |
| node-forge 1.4.0 | GHSA-86w9-cpqp-85rv | Expo CLI and its code-signing helper → node-forge | RSA signature verification can accept malformed signatures. |
| sprintf-js 1.0.3 | GHSA-hp3w-g68c-fv3c | Tooling → js-yaml → argparse → sprintf-js | Unbounded precision can exhaust the tooling process resources. |

On this shell, native development exports with source maps contain 1,243 Android
and 1,220 iOS sources. None belongs to these three packages. This establishes their
absence from the current exported JavaScript; it does not prove future app code or
every build-tool path is safe. Build machines still install and execute these tools.

Approved temporary acceptance: allow only these exact advisory IDs and affected
versions through a checked-in audit policy expiring on 8 November 2026. Continue
auditing on every verify/CI run. Fail on any new advisory, changed affected version,
expired exception or audit/network error. Report accepted findings visibly. Keep
development servers local, build only trusted source/configuration, and accept no
untrusted glob patterns or formatter strings in tooling. Review node-forge's
signing use again before EAS Update or remote distribution is introduced.

This proposal accepts remaining development/build-tool risk. It does not fix the
upstream vulnerabilities and is not a release approval. Once patched versions are
published, remove exceptions and update the lockfile before release.

Sources:

- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
