// M6: Motion MCP accessibility guidance, translated to native Reanimated.
// Near-critical spring (damping ratio 0.87) keeps editorial navigation restrained.
export const motion = {
  durationFast: 160,
  durationBase: 260,
  durationSlow: 420,
  easeOut: [0.2, 0, 0, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { stiffness: 260, damping: 28, mass: 1 },
  pressDuration: 80,
  headingRise: 12,
  rowRise: 8,
  stagger: 28,
  staggerLimit: 8,
  indeterminateDuration: 1400,
  reducedDuration: 0,
} as const;
