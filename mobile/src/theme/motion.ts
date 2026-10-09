// UI.md §7 starting values; MCP tuning and Reanimated implementation belong to M6.
export const motion = {
  durationFast: 160,
  durationBase: 260,
  durationSlow: 420,
  easeOut: [0.2, 0, 0, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { stiffness: 260, damping: 28, mass: 1 },
} as const;
