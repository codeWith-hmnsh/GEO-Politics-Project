// Motion tokens (docs4.0/UI-DESIGN.md §6.1). Use these instead of ad-hoc durations and springs.
export const dur = { micro: 0.12, small: 0.2, medium: 0.32, large: 0.6 } as const;
export const ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1] } as const;
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  gentle: { type: "spring", stiffness: 170, damping: 24 },
  layout: { type: "spring", bounce: 0.15, visualDuration: 0.35 },
} as const;
export const stagger = { list: 0.04, numbers: 0.08 } as const;
