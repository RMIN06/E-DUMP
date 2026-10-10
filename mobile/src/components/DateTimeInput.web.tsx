import type { CSSProperties } from "react";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textStyle } from "../theme/typography";
export function DateTimeInput({
  value,
  onChange,
  mode,
}: {
  value: Date;
  mode?: "date" | "time";
  onChange?: (
    event: {
      type: "set";
      nativeEvent: { timestamp: number; utcOffset: number };
    },
    date?: Date,
  ) => void;
  timeZoneName?: string;
  is24Hour?: boolean;
  themeVariant?: string;
}) {
  const theme = useTheme();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(value)
    .replace(" ", "T");
  const local = parts;
  return (
    <input
      aria-label={mode === "time" ? "Due time" : "Due date"}
      type={mode === "time" ? "time" : "date"}
      value={mode === "time" ? local.slice(11, 16) : local.slice(0, 10)}
      style={{
        ...(textStyle("body") as CSSProperties),
        color: theme.bone,
        background: theme.surface,
        colorScheme: "dark",
        padding: space.lg,
        border: "none",
        borderRadius: controls.radius,
        minHeight: controls.touchHeight,
        maxWidth: "100%",
      }}
      onChange={(event) => {
        if (!event.target.value) return;
        const datePart =
          mode === "time" ? local.slice(0, 10) : event.target.value;
        const timePart =
          mode === "time" ? event.target.value : local.slice(11, 16);
        const date = new Date(`${datePart}T${timePart}:00+05:00`);
        onChange?.(
          {
            type: "set",
            nativeEvent: {
              timestamp: date.getTime(),
              utcOffset: 300,
            },
          },
          date,
        );
      }}
    />
  );
}
