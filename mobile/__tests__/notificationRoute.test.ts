import { notificationRoute } from "../src/lib/notificationRoute";
test("material and announcement alerts open only validated internal records", () => {
  const id = "a".repeat(24);
  expect(notificationRoute({ material_id: id })).toBe(`/material/${id}`);
  expect(notificationRoute({ announcement_id: id })).toBe(`/updates/${id}`);
  for (const data of [
    null,
    "path",
    {},
    { material_id: 42 },
    { material_id: "https://evil.test" },
    { announcement_id: "bad" },
    { announcement_id: id, material_id: id },
  ])
    expect(notificationRoute(data)).toBeNull();
});
