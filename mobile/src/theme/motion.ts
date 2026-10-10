// Motion MCP transitions/accessibility: native opacity feedback and springs without overshoot.
export const motion = {
  durationFast: 160,
  durationBase: 260,
  durationSlow: 420,
  easeOut: [0.2, 0, 0, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { stiffness: 260, damping: 33, mass: 1, overshootClamping: true },
  pressDuration: 80,
  releaseDuration: 160,
  headingRise: 12,
  rowRise: 8,
  stagger: 28,
  staggerLimit: 8,
  indeterminateDuration: 1400,
  reducedDuration: 0,
  pressScale: 0.975,
  iconActiveScale: 1.08,
} as const;
