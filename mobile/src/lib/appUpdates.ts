// Apply only on read-only tab roots; never restart during a form or upload.
export function canApplyAppUpdate(path: string) {
  return ["/updates", "/subjects", "/schedule", "/me"].includes(path);
}
