import { canApplyAppUpdate } from "../src/lib/appUpdates";
test("restart is offered only on read-only tab roots, keeping uploads and forms intact", () => {
  for (const path of ["/updates", "/subjects", "/schedule", "/me"])
    expect(canApplyAppUpdate(path)).toBe(true);
  for (const path of [
    "/upload/coal",
    "/updates/new",
    "/name",
    "/sign-in",
    "/material/123",
    "/admin/users",
  ])
    expect(canApplyAppUpdate(path)).toBe(false);
});
