import { formatInTimeZone } from "date-fns-tz";

export const classZone = "Asia/Karachi";
export const karachiDay = (now = new Date()) =>
  Number(formatInTimeZone(now, classZone, "i"));
export const karachiTime = (now = new Date()) =>
  formatInTimeZone(now, classZone, "HH:mm");
export function classTime(value: string) {
  const [hour, minute] = value.split(":");
  const number = Number(hour);
  return `${number % 12 || 12}:${minute} ${number >= 12 ? "PM" : "AM"}`;
}
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function relativeTime(value: string, now = new Date()) {
  const age = Math.max(0, now.getTime() - new Date(value).getTime());
  if (age < 60 * 60 * 1000) return `${Math.floor(age / (60 * 1000))}m ago`;
  if (age < 24 * 60 * 60 * 1000)
    return `${Math.floor(age / (60 * 60 * 1000))}h ago`;
  if (age < 7 * 24 * 60 * 60 * 1000)
    return `${Math.floor(age / (24 * 60 * 60 * 1000))}d ago`;
  return formatInTimeZone(value, classZone, "EEE d MMM");
}
