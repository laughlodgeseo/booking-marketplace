export const UI_BREAKPOINTS = {
  mobile: 0,
  sm: 640,
  md: 768,
  lg: 1024,
} as const;

export type UiBreakpointKey = keyof typeof UI_BREAKPOINTS;
