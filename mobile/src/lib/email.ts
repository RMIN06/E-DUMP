export const emailMessage =
  "Use your student email, like l25xxxx@lhr.nu.edu.pk";

export function studentEmail(value: string): string | null {
  if (/[^\x20-\x7e]/.test(value)) return null;
  const email = value.replace(/^ +| +$/g, "").toLowerCase();
  return email.length <= 64 &&
    (email === "l242530@lhr.nu.edu.pk" ||
      /^l25[0-9]{4}@lhr\.nu\.edu\.pk$/.test(email))
    ? email
    : null;
}
