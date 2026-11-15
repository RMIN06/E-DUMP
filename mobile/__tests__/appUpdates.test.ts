import { canApplyAppUpdate } from "../src/lib/appUpdates";
test("explicit restart is reachable before login while content forms and uploads stay protected", () => {
  for (const path of [
    "/",
    "/sign-in",
    "/updates",
    "/subjects",
    "/schedule",
    "/me",
  ])
    expect(canApplyAppUpdate(path)).toBe(true);
  for (const path of [
    "/upload/coal",
    "/updates/new",
    "/name",
    "/material/123",
    "/admin/users",
  ])
    expect(canApplyAppUpdate(path)).toBe(false);
});
