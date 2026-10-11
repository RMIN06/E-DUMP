export function notificationRoute(
  data: unknown,
): `/updates/${string}` | `/material/${string}` | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const announcement = payload.announcement_id;
  const material = payload.material_id;
  if (announcement && material) return null;
  if (typeof announcement === "string" && /^[a-f\d]{24}$/i.test(announcement))
    return `/updates/${announcement}`;
  if (typeof material === "string" && /^[a-f\d]{24}$/i.test(material))
    return `/material/${material}`;
  return null;
}
