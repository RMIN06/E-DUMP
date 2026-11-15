// Updates remain reachable when login/restoration is unavailable. Restart is
// always explicit; content forms and uploads must still finish first.
export function canApplyAppUpdate(path: string) {
  return [
    "/",
    "/sign-in",
    "/updates",
    "/subjects",
    "/schedule",
    "/me",
  ].includes(path);
}
