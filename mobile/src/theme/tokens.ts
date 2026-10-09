export const colors = {
  ink: "#121A1B",
  olive: "#505039",
  moss: "#A7AA63",
  bone: "#EAE6D2",
  danger: "#C46A4A",
} as const;

const opacity = (hex: string, alpha: number) => {
  const channels = [1, 3, 5].map((offset) =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );
  return `rgba(${channels.join(", ")}, ${alpha})`;
};

export const theme = {
  ...colors,
  boneMuted: opacity(colors.bone, 0.68),
  boneFaint: opacity(colors.bone, 0.45),
  line: colors.olive,
  lineSoft: opacity(colors.olive, 0.55),
  pressed: opacity(colors.bone, 0.06),
} as const;

export function useTheme() {
  return theme;
}
