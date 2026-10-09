export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;
export const layout = {
  fill: 1,
  columnWidth: "100%",
  maxContentWidth: 560,
  rowHeight: 64,
  iconSize: 22,
  iconStroke: 1.5,
  tabHeight: 64,
  listInitial: 12,
  listBatch: 10,
  listWindow: 7,
  listEndThreshold: 0.6,
} as const;
export const controls = {
  buttonHeight: 52,
  touchHeight: 48,
  radius: 4,
  hairline: 1,
  focusLine: 2,
  pressedOpacity: 0.85,
} as const;
